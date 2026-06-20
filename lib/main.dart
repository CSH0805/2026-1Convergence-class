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
  Set<String> _centerNodeIds = {};
  String? _errorMessage;
  bool _hasVirtualRoot = false;

  final _config = BuchheimWalkerConfiguration()
    ..siblingSeparation = 50
    ..levelSeparation = 80
    ..subtreeSeparation = 50
    ..orientation = BuchheimWalkerConfiguration.ORIENTATION_TOP_BOTTOM;

  // ── JSON 파싱 & 그래프 빌드 ──────────────────────────────────────────
  void _parseAndRender() {
    final text = _jsonController.text.trim();
    if (text.isEmpty) { _setError('JSON을 입력해주세요.'); return; }

    Map<String, dynamic> data;
    try {
      data = jsonDecode(text) as Map<String, dynamic>;
    } on FormatException catch (e) {
      _setError('JSON 형식 오류:\n${e.message}\n\n쉼표 누락, 따옴표 불일치 등을 확인해주세요.');
      return;
    }

    // ── 입력 형식 자동 감지 ──────────────────────────────────────────
    Map<String, dynamic> graphData;
    final centerIds = <String>{};

    if (data.containsKey('graph')) {
      // 백엔드 /result 응답 (graph 필드 포함)
      graphData = data['graph'] as Map<String, dynamic>;
      centerIds.add('__center__');
    } else if (data.containsKey('keywords') && data.containsKey('diagnosis')) {
      // 백엔드 /result 응답 (구버전, graph 필드 없음) → 자동 변환
      graphData = _convertFromBackendResult(data);
      centerIds.add('__center__');
    } else if (data.containsKey('nodes') && data.containsKey('edges')) {
      // 직접 입력한 nodes/edges 형식
      graphData = data;
    } else {
      _setError('"nodes"/"edges" 형식 또는 백엔드 /result JSON을 붙여넣어 주세요.');
      return;
    }

    _buildGraphFromData(graphData, centerIds);
  }

  // 백엔드 /result 형식을 nodes/edges 로 변환
  Map<String, dynamic> _convertFromBackendResult(Map<String, dynamic> data) {
    const typeLabel = {'avoidant': '회피형', 'anxious': '불안형', 'secure': '안정형', 'neglected': '방치형'};
    final diagType = (data['diagnosis'] as Map?)?.containsKey('type') == true
        ? (data['diagnosis'] as Map)['type']?.toString() ?? ''
        : '';
    final centerLabel = typeLabel[diagType] ?? diagType;

    final keywords = ((data['keywords'] as List?) ?? []).cast<Map<String, dynamic>>();
    final nodeMap = <String, Map<String, String>>{};
    final edges = <Map<String, String>>[];

    nodeMap['__center__'] = {'id': '__center__', 'label': centerLabel};

    for (final k in keywords) {
      final kw = k['keyword']?.toString() ?? '';
      final rel = k['related_keyword']?.toString();
      if (kw.isNotEmpty && !nodeMap.containsKey(kw)) nodeMap[kw] = {'id': kw, 'label': kw};
      if (rel != null && rel.isNotEmpty && !nodeMap.containsKey(rel)) nodeMap[rel] = {'id': rel, 'label': rel};
      if (rel != null && rel.isNotEmpty) edges.add({'from': kw, 'to': rel});
    }

    final hasIncoming = edges.map((e) => e['to']!).toSet();
    for (final id in nodeMap.keys) {
      if (id != '__center__' && !hasIncoming.contains(id)) {
        edges.add({'from': '__center__', 'to': id});
      }
    }

    return {'nodes': nodeMap.values.toList(), 'edges': edges};
  }

  // nodes/edges 데이터 → Graph 객체 빌드
  void _buildGraphFromData(Map<String, dynamic> graphData, Set<String> centerIds) {
    try {
      final nodeList = (graphData['nodes'] as List?)?.cast<Map<String, dynamic>>();
      final edgeList = (graphData['edges'] as List?)?.cast<Map<String, dynamic>>();

      if (nodeList == null) { _setError('"nodes" 키가 없습니다.'); return; }
      if (edgeList == null) { _setError('"edges" 키가 없습니다.'); return; }
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
        if (!nodeMap.containsKey(from)) { _setError('edges에 존재하지 않는 노드: "$from"'); return; }
        if (!nodeMap.containsKey(to))   { _setError('edges에 존재하지 않는 노드: "$to"');   return; }
        graph.addEdge(nodeMap[from]!, nodeMap[to]!);
        hasIncoming.add(to);
      }

      // 루트가 여러 개면 가상 중심 노드 추가
      final roots = nodeMap.keys.where((id) => !hasIncoming.contains(id)).toList();
      bool hasVirtualRoot = false;
      if (roots.length > 1 && !roots.any((r) => centerIds.contains(r))) {
        const vId = '__virtual_root__';
        final vNode = Node.Id(vId);
        labelMap[vId] = '(중심)';
        centerIds.add(vId);
        graph.addNode(vNode);
        for (final r in roots) graph.addEdge(vNode, nodeMap[r]!);
        hasVirtualRoot = true;
      }

      setState(() {
        _graph = graph;
        _labelMap = labelMap;
        _centerNodeIds = centerIds;
        _errorMessage = null;
        _hasVirtualRoot = hasVirtualRoot;
      });
    } catch (e) {
      _setError('처리 중 오류: $e');
    }
  }

  void _setError(String msg) => setState(() { _graph = null; _errorMessage = msg; });

  // ── 노드 클릭 → AlertDialog ───────────────────────────────────────────
  void _onNodeTap(String nodeId) {
    if (nodeId == '__virtual_root__') return;
    final label = _labelMap[nodeId] ?? nodeId;
    final isCenter = _centerNodeIds.contains(nodeId);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(isCenter ? Icons.psychology_outlined : Icons.circle,
                color: isCenter ? Colors.amber.shade700 : Colors.teal, size: 18),
            const SizedBox(width: 8),
            Text(isCenter ? '진단 결과' : '노드 정보'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!isCenter) ...[
              Text('ID', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              Text(nodeId, style: const TextStyle(fontSize: 12)),
              const SizedBox(height: 10),
            ],
            Text('키워드', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            Text(label, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('닫기')),
        ],
      ),
    );
  }

  // ── 노드 위젯 ─────────────────────────────────────────────────────────
  Widget _nodeBuilder(Node node) {
    final id = node.key!.value.toString();
    final label = _labelMap[id] ?? id;
    final isCenter = _centerNodeIds.contains(id);

    return GestureDetector(
      onTap: () => _onNodeTap(id),
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: isCenter ? 22 : 16,
          vertical: isCenter ? 14 : 9,
        ),
        decoration: BoxDecoration(
          color: isCenter ? Colors.amber.shade600 : Colors.teal.shade400,
          borderRadius: BorderRadius.circular(isCenter ? 30 : 22),
          boxShadow: [
            BoxShadow(
              color: (isCenter ? Colors.amber : Colors.teal).withValues(alpha: 0.35),
              blurRadius: isCenter ? 10 : 6,
              offset: const Offset(2, 3),
            ),
          ],
        ),
        child: Text(
          label,
          style: TextStyle(
            color: Colors.white,
            fontSize: isCenter ? 16 : 13,
            fontWeight: isCenter ? FontWeight.bold : FontWeight.w600,
          ),
        ),
      ),
    );
  }

  // ── UI ────────────────────────────────────────────────────────────────
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
              _centerNodeIds = {};
            }),
          ),
        ],
      ),
      body: Column(
        children: [
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
                    labelText: '백엔드 /result JSON 또는 nodes/edges JSON 붙여넣기',
                    hintText: '백엔드 결과를 그대로 붙여넣어도 됩니다.',
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
                      '⚠  루트가 여러 개라 가상 중심 노드를 자동 추가했습니다.',
                      style: TextStyle(color: Colors.orange.shade700, fontSize: 12),
                    ),
                  ),
              ],
            ),
          ),
          const Divider(height: 1),
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
              Text(_errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 14),
                  textAlign: TextAlign.center),
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
            Text('백엔드 /result 응답을 그대로 붙여넣어도 됩니다.',
                style: TextStyle(color: Colors.grey, fontSize: 12)),
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
            ..strokeWidth = 1.5
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

// 앱 시작 시 보여줄 샘플 — 백엔드 /result 형식 그대로
const _sampleJson = '''
{
  "character": "quokka",
  "diagnosis": {
    "type": "anxious",
    "reasoning": "샘플 진단 근거입니다."
  },
  "keywords": [
    { "keyword": "외로움", "related_keyword": null },
    { "keyword": "관심사", "related_keyword": "소통" },
    { "keyword": "슬픔", "related_keyword": "감정 표현" },
    { "keyword": "소심함", "related_keyword": null },
    { "keyword": "친구 관계", "related_keyword": "무시" },
    { "keyword": "로블록스", "related_keyword": "게임" },
    { "keyword": "배드민턴", "related_keyword": "스포츠" },
    { "keyword": "담임선생님", "related_keyword": "지지" },
    { "keyword": "조언", "related_keyword": "관심사 만들기" },
    { "keyword": "감정 털어놓기", "related_keyword": "어려움" }
  ]
}
''';
