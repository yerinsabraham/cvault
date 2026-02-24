/// User model
class User {
  final String id;
  final String email;
  final String tenantId;
  final DateTime createdAt;

  User({
    required this.id,
    required this.email,
    required this.tenantId,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      tenantId: json['tenantId'] as String? ?? '',
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'tenantId': tenantId,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

/// Device model
class Device {
  final String id;
  final String deviceName;
  final String? deviceType;
  final String assignedIp;
  final String config;
  final Server server;
  final DateTime? lastConnectedAt;
  final DateTime createdAt;

  Device({
    required this.id,
    required this.deviceName,
    this.deviceType,
    required this.assignedIp,
    required this.config,
    required this.server,
    this.lastConnectedAt,
    required this.createdAt,
  });

  factory Device.fromJson(Map<String, dynamic> json) {
    return Device(
      id: json['id'] as String? ?? '',
      deviceName: json['deviceName'] as String? ?? '',
      deviceType: json['deviceType'] as String?,
      assignedIp: json['assignedIp'] as String? ?? '',
      config: json['config'] as String? ?? '',
      server: Server.fromJson(json['server'] ?? {}),
      lastConnectedAt: json['lastConnectedAt'] != null
          ? DateTime.parse(json['lastConnectedAt'] as String)
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}

/// Server model
class Server {
  final String id;
  final String name;
  final String region;
  final String? publicIp;
  final int? port;

  Server({
    required this.id,
    required this.name,
    required this.region,
    this.publicIp,
    this.port,
  });

  factory Server.fromJson(Map<String, dynamic> json) {
    return Server(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      region: json['region'] as String? ?? '',
      publicIp: json['publicIp'] as String?,
      port: (json['endpointPort'] ?? json['port']) as int?,
    );
  }
}

/// VPN Session model
class VPNSession {
  final String id;
  final String status;
  final DateTime connectedAt;
  final DateTime? disconnectedAt;
  final SessionDevice device;
  final SessionServer server;

  VPNSession({
    required this.id,
    required this.status,
    required this.connectedAt,
    this.disconnectedAt,
    required this.device,
    required this.server,
  });

  factory VPNSession.fromJson(Map<String, dynamic> json) {
    return VPNSession(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? '',
      connectedAt: json['connectedAt'] != null
          ? DateTime.parse(json['connectedAt'] as String)
          : DateTime.now(),
      disconnectedAt: json['disconnectedAt'] != null
          ? DateTime.parse(json['disconnectedAt'] as String)
          : null,
      device: SessionDevice.fromJson(json['device'] ?? {}),
      server: SessionServer.fromJson(json['server'] ?? {}),
    );
  }
}

class SessionDevice {
  final String id;
  final String deviceName;
  final String assignedIp;

  SessionDevice({
    required this.id,
    required this.deviceName,
    required this.assignedIp,
  });

  factory SessionDevice.fromJson(Map<String, dynamic> json) {
    return SessionDevice(
      id: json['id'] as String? ?? '',
      deviceName: json['deviceName'] as String? ?? '',
      assignedIp: json['assignedIp'] as String? ?? '',
    );
  }
}

class SessionServer {
  final String id;
  final String publicIp;
  final int endpointPort;
  final String region;

  SessionServer({
    required this.id,
    required this.publicIp,
    required this.endpointPort,
    required this.region,
  });

  factory SessionServer.fromJson(Map<String, dynamic> json) {
    return SessionServer(
      id: json['id'] as String? ?? '',
      publicIp: json['publicIp'] as String? ?? '',
      endpointPort: json['endpointPort'] as int? ?? 0,
      region: json['region'] as String? ?? '',
    );
  }
}

/// Server Status model
class ServerStatus {
  final int peerCount;
  final String status;

  ServerStatus({
    required this.peerCount,
    required this.status,
  });

  factory ServerStatus.fromJson(Map<String, dynamic> json) {
    final server = json['server'] as Map<String, dynamic>? ?? {};
    return ServerStatus(
      peerCount: server['peerCount'] as int? ?? 0,
      status: server['status'] as String? ?? 'unknown',
    );
  }
}
