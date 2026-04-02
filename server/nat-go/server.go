package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v3"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Msg struct {
	SDP          string `json:"sdp,omitempty"`
	ICECandidate string `json:"ice-candidate,omitempty"`
	ProbeAnswer  string `json:"probe-answer,omitempty"`
}

type Result struct {
	NATType  string `json:"public_ip"`
	PublicIP string `json:"nat_type"`
}

type ClientSession struct {
	ws        *websocket.Conn
	pcA       *webrtc.PeerConnection
	pcB       *webrtc.PeerConnection
	publicIP  string
	ports     map[string]bool
	mu        sync.Mutex
	dataChanA *webrtc.DataChannel
	pcBRecv   bool
}

func main() {
	http.HandleFunc("/ws", wsHandler)
	log.Println("NAT检测服务器启动在 :9000")
	http.ListenAndServe(":9000", nil)
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket升级失败:", err)
		return
	}
	defer ws.Close()

	session := &ClientSession{
		ws:     ws,
		ports:  make(map[string]bool),
		pcBRecv: false,
	}

	// === 创建pcA（主连接，使用STUN）===
	pcA, err := webrtc.NewPeerConnection(webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{URLs: []string{"stun:stun.l.google.com:19302"}},
		},
	})
	if err != nil {
		log.Println("创建pcA失败:", err)
		return
	}
	session.pcA = pcA
	defer pcA.Close()

	// === 创建pcB（探测连接，不用STUN，使用不同端口）===
	pcB, err := webrtc.NewPeerConnection(webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{},
	})
	if err != nil {
		log.Println("创建pcB失败:", err)
		return
	}
	session.pcB = pcB
	defer pcB.Close()

	// === pcA接收DataChannel ===
	pcA.OnDataChannel(func(dc *webrtc.DataChannel) {
		session.dataChanA = dc
		log.Println("pcA收到DataChannel:", dc.Label())

		dc.OnOpen(func() {
			log.Println("pcA DataChannel已打开")

			// 开始Full Cone探测
			go session.probeFullCone()
		})

		dc.OnMessage(func(msg webrtc.DataChannelMessage) {
			text := string(msg.Data)
			log.Println("pcA收到消息:", text)

			if text == "probe-ack" {
				session.mu.Lock()
				session.pcBRecv = true
				session.mu.Unlock()
			}
		})
	})

	// === pcA的ICE候选者 ===
	pcA.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil {
			return
		}
		session.ws.WriteJSON(map[string]string{
			"ice-candidate": c.ToJSON().Candidate,
		})
	})

	pcA.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Println("pcA ICE状态:", state.String())
	})

	// === pcB的DataChannel（用于探测）===
	pcB.OnDataChannel(func(dc *webrtc.DataChannel) {
		log.Println("pcB收到DataChannel:", dc.Label())
		dc.OnOpen(func() {
			log.Println("pcB DataChannel已打开")
			dc.SendText("probe")
		})
		dc.OnMessage(func(msg webrtc.DataChannelMessage) {
			log.Println("pcB收到消息:", string(msg.Data))
		})
	})

	pcB.OnICECandidate(func(c *webrtc.ICECandidate) {
		if c == nil {
			return
		}
		log.Println("pcB ICE候选者:", c.ToJSON().Candidate)
	})

	pcB.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
		log.Println("pcB ICE状态:", state.String())
	})

	// === 处理WebSocket消息 ===
	for {
		var msg Msg
		if err := ws.ReadJSON(&msg); err != nil {
			log.Println("读取消息失败:", err)
			break
		}

		if msg.SDP != "" {
			log.Println("收到SDP Offer")
			session.handleSDP(msg.SDP)
		}

		if msg.ICECandidate != "" {
			session.handleICECandidate(msg.ICECandidate)
		}

		if msg.ProbeAnswer != "" {
			log.Println("收到探测Answer")
			session.handleProbeAnswer(msg.ProbeAnswer)
		}
	}
}

func (s *ClientSession) handleSDP(sdp string) {
	err := s.pcA.SetRemoteDescription(webrtc.SessionDescription{
		Type: webrtc.SDPTypeOffer,
		SDP:  sdp,
	})
	if err != nil {
		log.Println("设置RemoteDescription失败:", err)
		return
	}

	answer, err := s.pcA.CreateAnswer(nil)
	if err != nil {
		log.Println("创建Answer失败:", err)
		return
	}

	err = s.pcA.SetLocalDescription(answer)
	if err != nil {
		log.Println("设置LocalDescription失败:", err)
		return
	}

	s.ws.WriteJSON(map[string]string{
		"sdp": answer.SDP,
	})
	log.Println("已发送SDP Answer")
}

func (s *ClientSession) handleICECandidate(candidate string) {
	log.Println("收到客户端ICE候选者:", candidate[:min(60, len(candidate))])

	err := s.pcA.AddICECandidate(webrtc.ICECandidateInit{
		Candidate: candidate,
	})
	if err != nil {
		log.Println("添加ICE候选者失败:", err)
		return
	}

	// 解析srflx候选者
	if strings.Contains(candidate, "srflx") && strings.Contains(candidate, "udp") {
		parts := strings.Split(candidate, " ")
		if len(parts) >= 6 {
			ip := parts[4]
			port := parts[5]

			// 跳过IPv6
			if !strings.Contains(ip, ":") {
				s.mu.Lock()
				s.publicIP = ip
				s.ports[port] = true
				s.mu.Unlock()
				log.Printf("记录客户端srflx: IP=%s, Port=%s\n", ip, port)
			}
		}
	}
}

func (s *ClientSession) handleProbeAnswer(answerSdp string) {
	log.Println("设置探测Answer")

	err := s.pcB.SetRemoteDescription(webrtc.SessionDescription{
		Type: webrtc.SDPTypeAnswer,
		SDP:  answerSdp,
	})
	if err != nil {
		log.Println("设置pcB RemoteDescription失败:", err)
	}
}

func (s *ClientSession) probeFullCone() {
	log.Println("开始Full Cone探测...")

	// 等待ICE连接建立
	time.Sleep(2 * time.Second)

	s.mu.Lock()
	ip := s.publicIP
	s.mu.Unlock()

	if ip == "" {
		s.sendResult("Blocked", "")
		return
	}

	// 端口超过1个，对称型NAT
	if len(s.ports) > 1 {
		s.sendResult("Symmetric", ip)
		return
	}

	// 尝试用pcB创建offer连接客户端
	log.Println("使用pcB探测Full Cone...")

	// 创建DataChannel用于探测
	dcB, err := s.pcB.CreateDataChannel("probe", nil)
	if err != nil {
		log.Println("创建探测DataChannel失败:", err)
		s.sendResult("Port Restricted Cone", ip)
		return
	}

	dcB.OnOpen(func() {
		log.Println("pcB DataChannel已打开，发送probe")
		dcB.SendText("probe")
	})

	dcB.OnMessage(func(msg webrtc.DataChannelMessage) {
		log.Println("pcB收到消息:", string(msg.Data))
		s.mu.Lock()
		s.pcBRecv = true
		s.mu.Unlock()
	})

	offer, err := s.pcB.CreateOffer(nil)
	if err != nil {
		log.Println("pcB创建offer失败:", err)
		s.sendResult("Port Restricted Cone", ip)
		return
	}

	err = s.pcB.SetLocalDescription(offer)
	if err != nil {
		log.Println("pcB设置local desc失败:", err)
		s.sendResult("Port Restricted Cone", ip)
		return
	}

	// 将pcB的offer发送给客户端，让客户端添加
	s.ws.WriteJSON(map[string]string{
		"probe-offer": offer.SDP,
	})

	// 等待探测结果
	time.Sleep(4 * time.Second)

	s.mu.Lock()
	recv := s.pcBRecv
	s.mu.Unlock()

	if recv {
		s.sendResult("Full Cone", ip)
	} else {
		s.sendResult("Port Restricted Cone", ip)
	}
}

func (s *ClientSession) sendResult(natType, ip string) {
	result := map[string]string{
		"nat_type":  natType,
		"public_ip": ip,
	}

	jsonData, _ := json.Marshal(result)
	log.Println("发送结果:", string(jsonData))

	s.ws.WriteJSON(result)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
