<?php
// Simple JSON saver for wedding story hotspots/pages.
// Writes to data/story.json so all devices load the same data.

header('Content-Type: application/json; charset=utf-8');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Empty request body']);
    exit;
}

$data = json_decode($raw, true);
if (!is_array($data) || !isset($data['hotspots']) || !isset($data['pages'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON payload']);
    exit;
}

// Basic shape validation
if (!is_array($data['hotspots']) || !is_array($data['pages'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'hotspots/pages must be arrays']);
    exit;
}

$dir = __DIR__;
if (!is_dir($dir)) {
    if (!mkdir($dir, 0775, true)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Failed to create data directory']);
        exit;
    }
}

$file = $dir . DIRECTORY_SEPARATOR . 'story.json';
$json = json_encode(
    [
        'hotspots' => $data['hotspots'],
        'pages'    => $data['pages'],
        'savedAt'  => date('c'),
    ],
    JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
);

if ($json === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to encode JSON']);
    exit;
}

if (file_put_contents($file, $json) === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to write story.json']);
    exit;
}

echo json_encode(['ok' => true]);
