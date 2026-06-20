import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:graphview/GraphView.dart';

void main() => runApp(const CalmmateMindMapApp());

class CalmmateMindMapApp extends StatelessWidget {
  const CalmmateMindMapApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Calmmate 마인드맵 테스트',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: const MindMapScreen(),
    );
  }
}

class MindMapScreen extends StatefulWidget {
  const MindMapScreen({super.key});

  @override
  State<MindMapScreen> createState() => _MindMapScreenState();
}

class _MindMapScreenState extends State<MindMapScreen> {
  final _jsonController = TextEditingController(text: _sampleJson);
  Graph? _graph;
  Map<String, String> _labelMap = {};
  String? _errorMessage;
  bool _hasVirtualRoot = false;

  final _config = BuchheimWalkerConfiguration()
    ..siblingSeparation = 60
    ..levelSeparation = 90
    ..subtreeSeparation = 60
    ..orientation = BuchheimWalkerConfiguration.ORIENTATION_TOP_BOTTOM;

  // JSON 파싱 & 그래프 빌드
  void _parseAndRender() {
    final text = _jsonController.text.trim();
    if (text.isEmpty) {
      _setError('JSON을 입력해주세요.');
      return;
    }

    Map<String, dynamic> data;
    try {
      data = jsonDecode(text) as Map<String, dynamic>;
    } on FormatException catch (e) {
      _setError('JSON 형식 오류:\n${e.message}\n\n쉼표 누락, 따옴표 불일치 등을 확인해주세요.');
      return;
    }

    try {
      final rawNodes = data['nodes'];
      final rawEdges = data['edges'];
      if (rawNodes == null) { _setError('"nodes" 키가 없습니다.'); return; }
      if (rawEdges == null) { _setError('"edges" 키가 없습니다.'); return; }

      final nodeList = (rawNodes as List).cast<Map<String, dynamic>>();
      final edgeList = (rawEdges as List).cast<Map<String, dynamic>>();
      if (nodeList.isEmpty) { _setError('nodes 배열이 비어있습니다.'); return; }

      final graph = Graph()..isTree = true;
      final nodeMap = <String, Node>{};
      final labelMap = <String, String>{};

      for (final n in nodeList) {
        final id = n['id']?.toString() ?? '';
        if (id.isEmpty) { _setError('노드에 "id" 값이 없습니다.'); return; }
        nodeMap[id] = Node.Id(id);
        labelMap[id] = n['label']?.toString() ?? id;
        graph.addNode(nodeMap[id]!);
      }

      final hasIncoming = <String>{};
      for (final e in edgeList) {
        final from = e['from']?.toString() ?? '';
        final to   = e['to']?.toString()   ?? '';
        if (!nodeMap.containsKey(from)) { _setError('edges에 존재하지 않는 노드 참조: "$from"'); return; }
        if (!nodeMap.containsKey(to))   { _setError('edges에 존재하지 않는 노드 참조: "$to"');   return; }
        graph.addEdge(nodeMap[from]!, nodeMap[to]!);
        hasIncoming.add(to);
      }

      // 루트 탐색 (incoming edge 없는 노드)
      final roots = nodeMap.keys.where((id) => !hasIncoming.contains(id)).toList();
      bool hasVirtualRoot = false;

      if (roots.length > 1) {
        const vId = '__root__';
        final vNode = Node.Id(vId);
        labelMap[vId] = '✦ 중심';
        graph.addNode(vNode);
        for (final r in roots) {
          graph.addEdge(vNode, nodeMap[r]!);
        }
        hasVirtualRoot = true;
      }

      setState(() {
        _graph = graph;
        _labelMap = labelMap;
        _errorMessage = null;
        _hasVirtualRoot = hasVirtualRoot;
      });
    } catch (e) {
      _setError('처리 중 오류: $e');
    }
  }

  void _setError(String msg) => setState(() { _graph = null; _errorMessage = msg; });

  // 노드 클릭 → AlertDialog
  void _onNodeTap(String nodeId) {
    if (nodeId == '__root__') return;
    final label = _labelMap[nodeId] ?? nodeId;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.circle, color: Colors.teal, size: 16),
            SizedBox(width: 8),
            Text('노드 상세 정보'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('ID', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            Text(nodeId, style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 12),
            Text('라벨', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            Text(label, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('닫기')),
        ],
      ),
    );
  }

  // 노드 위젯
  Widget _nodeBuilder(Node node) {
    final id = node.key!.value.toString();
    final label = _labelMap[id] ?? id;
    final isVirtual = id == '__root__';

    return GestureDetector(
      onTap: () => _onNodeTap(id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          color: isVirtual ? Colors.grey.shade200 : Colors.teal.shade400,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.15),
              blurRadius: 6,
              offset: const Offset(2, 3),
            ),
          ],
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isVirtual ? Colors.grey.shade600 : Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Calmmate 마인드맵 테스트'),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: '샘플로 초기화',
            onPressed: () => setState(() {
              _jsonController.text = _sampleJson;
              _graph = null;
              _errorMessage = null;
              _hasVirtualRoot = false;
            }),
          ),
        ],
      ),
      body: Column(
        children: [
          // 입력 영역
          Container(
            color: Colors.grey.shade50,
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _jsonController,
                  maxLines: 6,
                  style: const TextStyle(fontSize: 12, fontFamily: 'monospace'),
                  decoration: InputDecoration(
                    labelText: '백엔드 JSON 붙여넣기',
                    hintText: '{"nodes": [...], "edges": [...]}',
                    border: const OutlineInputBorder(),
                    filled: true,
                    fillColor: Colors.white,
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () => _jsonController.clear(),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                ElevatedButton.icon(
                  onPressed: _parseAndRender,
                  icon: const Icon(Icons.account_tree_outlined),
                  label: const Text('그래프 그리기', style: TextStyle(fontSize: 15)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                if (_hasVirtualRoot)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      '⚠  루트가 여러 개라 가상 중심 노드(✦ 중심)를 자동 추가했습니다.',
                      style: TextStyle(color: Colors.orange.shade700, fontSize: 12),
                    ),
                  ),
              ],
            ),
          ),
          const Divider(height: 1),
          // 그래프 영역
          Expanded(child: _buildGraphArea()),
        ],
      ),
    );
  }

  Widget _buildGraphArea() {
    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 52),
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                style: const TextStyle(color: Colors.red, fontSize: 14),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    if (_graph == null) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.account_tree_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 12),
            Text('JSON을 입력하고 버튼을 눌러주세요.', style: TextStyle(color: Colors.grey)),
            SizedBox(height: 4),
            Text('노드를 클릭하면 상세 정보가 표시됩니다.', style: TextStyle(color: Colors.grey, fontSize: 12)),
          ],
        ),
      );
    }

    return InteractiveViewer(
      constrained: false,
      boundaryMargin: const EdgeInsets.all(200),
      minScale: 0.2,
      maxScale: 4.0,
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: GraphView(
          graph: _graph!,
          algorithm: BuchheimWalkerAlgorithm(_config, TreeEdgeRenderer(_config)),
          paint: Paint()
            ..color = Colors.teal.shade200
            ..strokeWidth = 1.8
            ..style = PaintingStyle.stroke,
          builder: _nodeBuilder,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _jsonController.dispose();
    super.dispose();
  }
}

// 앱 시작 시 보여줄 샘플 JSON
const _sampleJson = '''
{
  "nodes": [
    { "id": "1", "label": "불안감" },
    { "id": "2", "label": "학교" },
    { "id": "3", "label": "친구관계" },
    { "id": "4", "label": "외로움" },
    { "id": "5", "label": "스트레스" },
    { "id": "6", "label": "성적" },
    { "id": "7", "label": "소통 어려움" }
  ],
  "edges": [
    { "from": "1", "to": "2" },
    { "from": "1", "to": "3" },
    { "from": "1", "to": "4" },
    { "from": "2", "to": "5" },
    { "from": "2", "to": "6" },
    { "from": "3", "to": "7" }
  ]
}
''';
