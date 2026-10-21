<?php

namespace Tests\Feature;

use App\Models\Connection;
use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GraphDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_graph_marks_maps_and_reports_connections(): void
    {
        $map = Post::factory()->create([
            'slug' => 'topic-map',
            'tags' => ['moc'],
            'source_path' => 'published/maps/topic-map.md',
        ]);
        $note = Post::factory()->create([
            'slug' => 'a-note',
            'tags' => ['go'],
            'source_path' => 'til/go/a-note.md',
        ]);
        $orphan = Post::factory()->create(['slug' => 'orphan']);

        Connection::create([
            'from_id' => $map->slug,
            'to_id' => $note->slug,
            'type' => 'mentions',
            'weight' => 1,
        ]);
        Connection::create([
            'from_id' => $note->slug,
            'to_id' => $map->slug,
            'type' => 'mentions',
            'weight' => 1,
        ]);

        $response = $this->getJson('/data/graph');

        $response->assertOk();
        $response->assertJsonPath('stats.notes', 3);
        $response->assertJsonPath('stats.maps', 1);
        $response->assertJsonPath('stats.links', 1);
        $response->assertJsonPath('stats.isolated', 1);

        $nodes = collect($response->json('nodes'))->keyBy('id');

        $this->assertTrue($nodes['topic-map']['is_map']);
        $this->assertSame('published', $nodes['topic-map']['section']);
        $this->assertSame('maps', $nodes['topic-map']['folder']);
        $this->assertSame(1, $nodes['topic-map']['degree']);

        $this->assertFalse($nodes['a-note']['is_map']);
        $this->assertSame('til', $nodes['a-note']['section']);
        $this->assertSame('go', $nodes['a-note']['folder']);
        $this->assertSame(['topic-map'], $nodes['a-note']['maps']);
        $this->assertSame(1, $nodes['a-note']['degree']);

        $this->assertSame(0, $nodes['orphan']['degree']);
    }

    public function test_graph_excludes_drafts_and_handles_missing_source_paths(): void
    {
        Post::factory()->create(['slug' => 'live']);
        Post::factory()->draft()->create([
            'slug' => 'draft',
            'source_path' => 'til/go/draft.md',
        ]);

        Connection::create([
            'from_id' => 'live',
            'to_id' => 'draft',
            'type' => 'mentions',
            'weight' => 1,
        ]);

        $response = $this->getJson('/data/graph');

        $response->assertOk();
        $response->assertJsonPath('stats.notes', 1);
        $response->assertJsonPath('stats.links', 0);
        $response->assertJsonPath('nodes.0.section', 'other');
        $response->assertJsonPath('nodes.0.folder', null);
    }
}
