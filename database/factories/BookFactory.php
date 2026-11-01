<?php

namespace Database\Factories;

use App\Models\Book;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class BookFactory extends Factory
{
    protected $model = Book::class;

    public function definition(): array
    {
        $title = fake()->unique()->sentence(3);

        return [
            'title' => $title,
            'slug' => Str::slug($title),
            'author' => fake()->name(),
            'recommended_by' => fake()->sentence(),
            'thoughts' => fake()->paragraphs(2, true),
            'thoughts_html' => '<p>'.fake()->paragraphs(2, true).'</p>',
            'status' => 'finished',
            'started_on' => now()->subWeeks(2),
            'finished_on' => now()->subWeek(),
            'cover_url' => null,
            'tags' => [fake()->word()],
            'stats' => [
                'total_read_time' => 36000,
                'read_pages' => 300,
                'total_pages' => 320,
                'reading_days' => 10,
            ],
            'is_draft' => false,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_draft' => true,
        ]);
    }
}
