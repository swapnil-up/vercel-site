<?php

namespace Tests\Feature;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ToolsPageTest extends TestCase
{
    public function test_card_viewer_tool_renders(): void
    {
        $this->get('/tools/cards')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tools/CardViewer')
                ->where('meta.title', 'Card Viewer — Tools — Swapnil Upadhyay')
                ->where('meta.description', 'Open any Anki CSV deck and flip through its cards in your browser.')
            );
    }
}
