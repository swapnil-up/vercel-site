<?php

namespace Database\Factories;

use App\Models\Post;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class PostFactory extends Factory
{
    protected $model = Post::class;

    public function definition(): array
    {
        $title = fake()->sentence();
        return [
            'title' => $title,
            'slug' => Str::slug($title),
            'content' => fake()->paragraphs(3, true),
            'content_html' => '<p>'.fake()->paragraphs(3, true).'</p>',
            'description' => fake()->sentence(),
            'tags' => [fake()->word()],
            'published_date' => now(),
            'is_draft' => false,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_draft' => true,
        ]);
    }
}
