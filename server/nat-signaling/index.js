import { WebSocket, WebSocketServer } from "ws";

const PORT = process.env.PORT || 8080;

// STUN服务器配置
const STUN_SERVERS = ["stun.l.google.com:19302", "stun1.l.google.com:19302"];

// 存储连接信息
const clients = new Map();

// 创建WebSocket服务器
const wss = new WebSocketServer({ port: PORT });

console.log(`[NAT] 信令服务器启动在端口 ${PORT}`);

wss.on("connection", (ws, req) => {
	const clientId = generateId();
	const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

	console.log(`[NAT] 新连接: ${clientId} 来自 ${clientIp}`);

	const client = {
		id: clientId,
		ws: ws,
		ip: clientIp,
		iceCandidates: [],
		sdp: null,
		userAgent: null,
	};

	clients.set(clientId, client);

	ws.on("message", (data) => {
		try {
			const message = JSON.parse(data.toString());
			handleMessage(client, message);
		} catch (error) {
			console.error(`[NAT] 解析消息失败:`, error);
			ws.send(JSON.stringify({ error: "消息格式错误" }));
		}
	});

	ws.on("close", () => {
		console.log(`[NAT] 连接关闭: ${clientId}`);
		clients.delete(clientId);
	});

	ws.on("error", (error) => {
		console.error(`[NAT] 连接错误: ${clientId}`, error);
		clients.delete(clientId);
	});
});

function handleMessage(client, message) {
	console.log(`[NAT] 收到消息类型: ${Object.keys(message).join(", ")}`);

	if (message.sdp) {
		// 客户端发送SDP Offer
		client.sdp = message.sdp;
		client.userAgent = message["user-agent"];

		console.log(`[NAT] 收到SDP Offer, 生成Answer...`);

		// 生成SDP Answer（回传相同的SDP作为模拟）
		// 实际项目中应该使用完整的WebRTC栈
		const answer = generateSdpAnswer(message.sdp);

		client.ws.send(JSON.stringify({ sdp: answer }));
		console.log(`[NAT] 已发送SDP Answer`);
	}

	if (message["ice-candidate"]) {
		// 客户端发送ICE候选者
		const candidate = message["ice-candidate"];
		client.iceCandidates.push(candidate);

		console.log(`[NAT] 收到ICE候选者: ${candidate.substring(0, 60)}...`);

		// 解析候选者信息
		const candidateInfo = parseIceCandidate(candidate);
		console.log(
			`[NAT] 候选者类型: ${candidateInfo.type}, IP: ${candidateInfo.ip}:${candidateInfo.port}`,
		);

		// 如果收到了srflx候选者，可以开始判断NAT类型
		if (candidateInfo.type === "srflx") {
			// 发送一个模拟的服务器端候选者回去
			const serverCandidate = generateServerCandidate(candidateInfo);
			client.ws.send(JSON.stringify({ "ice-candidate": serverCandidate }));
		}

		// 收到足够信息后返回NAT类型
		if (client.iceCandidates.length >= 1) {
			setTimeout(() => {
				const natResult = analyzeNatType(client);
				client.ws.send(JSON.stringify(natResult));
				console.log(`[NAT] 发送结果: ${JSON.stringify(natResult)}`);
			}, 2000);
		}
	}
}

function parseIceCandidate(candidate) {
	const parts = candidate.split(" ");
	return {
		foundation: parts[0]?.split(":")[1],
		component: parts[1],
		protocol: parts[2],
		priority: parts[3],
		ip: parts[4],
		port: parts[5],
		type: parts[7],
	};
}

function generateSdpAnswer(offerSdp) {
	// 简单返回offer作为answer
	// 实际项目中需要完整的SDP处理
	return offerSdp;
}

function generateServerCandidate(clientInfo) {
	// 生成一个模拟的服务器端候选者
	// 实际项目中应该使用真实的STUN响应
	return `candidate:1 1 udp 2130706431 127.0.0.1 12345 typ srflx raddr ${clientInfo.ip} rport ${clientInfo.port}`;
}

function analyzeNatType(client) {
	const candidates = client.iceCandidates;
	const clientIp = client.ip;

	console.log(`[NAT] 分析 ${candidates.length} 个候选者...`);

	// 提取所有srflx候选者
	const srflxCandidates = candidates
		.map(parseIceCandidate)
		.filter((c) => c.type === "srflx");

	if (srflxCandidates.length === 0) {
		return {
			nat_type: "Blocked",
			public_ip: "未知",
		};
	}

	// 获取公网IP（第一个srflx候选者的IP）
	const publicIp = srflxCandidates[0].ip;
	const publicPort = srflxCandidates[0].port;

	// 检查是否有多个不同的端口（对称NAT的特征）
	const uniquePorts = new Set(srflxCandidates.map((c) => c.port));

	let natType;

	if (uniquePorts.size > 1) {
		// 多个不同端口 = 对称NAT
		natType = "Symmetric";
	} else {
		// 单个端口，需要进一步测试
		// 这里简化处理，实际需要双向测试
		// 默认返回Restricted Cone（较常见）
		natType = "Port Restricted Cone";
	}

	// 模拟测试结果（实际需要真实的STUN服务器交互）
	const natTypes = [
		"Full Cone",
		"Restricted Cone",
		"Port Restricted Cone",
		"Symmetric",
	];

	// 如果候选者数量较多，可能是对称NAT
	if (candidates.length > 2) {
		natType = "Symmetric";
	}

	return {
		nat_type: natType,
		public_ip: publicIp,
	};
}

function generateId() {
	return Math.random().toString(36).substring(2, 10);
}

// 优雅关闭
process.on("SIGINT", () => {
	console.log("\n[NAT] 正在关闭服务器...");
	wss.close(() => {
		console.log("[NAT] 服务器已关闭");
		process.exit(0);
	});
});
