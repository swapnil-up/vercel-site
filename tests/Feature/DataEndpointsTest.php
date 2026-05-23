<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\Quote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DataEndpointsTest extends TestCase
{
    use RefreshDatabase;

    public function test_quote_random_returns_quote(): void
    {
        Quote::create(['quote' => 'Test quote', 'author' => 'Test']);

        $response = $this->get('/data/quote/random');

        $response->assertStatus(200);
        $response->assertJson(['quote' => 'Test quote']);
    }

    public function test_now_returns_content(): void
    {
        Post::factory()->create([
            'slug' => 'now',
            'content_html' => '<p>Current status</p>',
        ]);

        $response = $this->get('/data/now');

        $response->assertStatus(200);
        $response->assertJson(['content' => '<p>Current status</p>']);
    }

    public function test_now_returns_404_when_not_found(): void
    {
        $response = $this->get('/data/now');

        $response->assertStatus(404);
    }
}
