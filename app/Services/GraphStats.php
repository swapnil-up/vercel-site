<?php

namespace App\Services;

use App\Models\Connection;
use App\Models\Post;
use App\Models\Thought;

/**
 * Counts that must agree between the homepage stop and the graph page.
 * The graph collapses an A->B and B->A connection into one link and drops
 * links whose endpoints are missing, so a raw Connection::count() disagrees.
 */
class GraphStats
{
    /**
     * @return array{notes: int, links: int}
     */
    public function summary(): array
    {
        $postSlugs = Post::where('is_draft', false)->pluck('slug');

        $nodeIds = $postSlugs
            ->merge(Thought::pluck('id'))
            ->unique()
            ->flip();

        $links = [];

        foreach (Connection::all(['from_id', 'to_id']) as $connection) {
            $from = $connection->from_id;
            $to = $connection->to_id;

            if ($from === $to || ! isset($nodeIds[$from]) || ! isset($nodeIds[$to])) {
                continue;
            }

            $pair = [$from, $to];
            sort($pair);
            $links[implode('|', $pair)] = true;
        }

        return [
            'notes' => $postSlugs->count(),
            'links' => count($links),
        ];
    }
}
