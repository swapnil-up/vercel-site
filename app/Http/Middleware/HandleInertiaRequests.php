<?php

namespace App\Http\Middleware;

use App\Models\Book;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            // Add meta data that will be available to all pages
            'meta' => [
                'title' => $this->getPageTitle($request),
                'description' => $this->getPageDescription($request),
                'url' => $request->url(),
                'image' => $this->getPageImage($request),
            ],
        ]);
    }

    /**
     * Get the page title based on the current route
     */
    protected function getPageTitle(Request $request): string
    {
        $routeName = $request->route()->getName();

        // Map routes to titles
        $titles = [
            'home' => 'Swapnil Upadhyay - Developer & Writer',
            'posts.index' => 'Articles - Swapnil Upadhyay',
            'posts.show' => $this->getArticleTitle($request),
            'books.index' => 'Books - Swapnil Upadhyay',
            'books.show' => $this->getBookTitle($request),
            'graph' => 'Knowledge Graph - Swapnil Upadhyay',
            'about' => 'About - Swapnil Upadhyay',
        ];

        return $titles[$routeName] ?? 'Swapnil Upadhyay';
    }

    /**
     * Get the page description
     */
    protected function getPageDescription(Request $request): string
    {
        $routeName = $request->route()->getName();

        $descriptions = [
            'home' => 'Personal website and blog about development, thoughts, and technology',
            'posts.index' => 'Technical articles and essays about development, Laravel, Vue, and more',
            'posts.show' => $this->getArticleDescription($request),
            'books.index' => 'Books Swapnil Upadhyay has read and what he thought',
            'books.show' => $this->getBookDescription($request),
            'graph' => 'An interconnected web of thoughts, ideas, and concepts',
            'about' => 'Learn more about Swapnil Upadhyay',
        ];

        return $descriptions[$routeName] ?? 'Personal website and blog';
    }

    /**
     * Get dynamic article title from route params or database
     */
    protected function getArticleTitle(Request $request): string
    {
        $slug = $request->route('slug');
        if (! $slug) {
            return 'Article - Swapnil Upadhyay';
        }
        $post = Post::where('slug', $slug)->first();

        return $post ? $post->title.' - Swapnil Upadhyay' : 'Article - Swapnil Upadhyay';
    }

    /**
     * Get dynamic article description
     */
    protected function getArticleDescription(Request $request): string
    {
        $slug = $request->route('slug');
        if (! $slug) {
            return 'Read this article on Swapnil Upadhyay\'s blog';
        }
        $post = Post::where('slug', $slug)->first();

        return $post
            ? ($post->description ?? substr(strip_tags($post->content), 0, 160))
            : 'Read this article on Swapnil Upadhyay\'s blog';
    }

    /**
     * Get dynamic book title from route params or database
     */
    protected function getBookTitle(Request $request): string
    {
        $slug = $request->route('slug');
        if (! $slug) {
            return 'Book - Swapnil Upadhyay';
        }
        $book = Book::where('slug', $slug)->first();

        return $book ? $book->title.' - Swapnil Upadhyay' : 'Book - Swapnil Upadhyay';
    }

    /**
     * Get dynamic book description
     */
    protected function getBookDescription(Request $request): string
    {
        $slug = $request->route('slug');
        if (! $slug) {
            return 'A book note on Swapnil Upadhyay\'s site';
        }
        $book = Book::where('slug', $slug)->first();

        return $book
            ? Str::limit(trim(strip_tags($book->thoughts_html ?? $book->thoughts ?? '')), 160)
                ?: 'A book note on Swapnil Upadhyay\'s site'
            : 'A book note on Swapnil Upadhyay\'s site';
    }

    /**
     * Get the og:image for social sharing
     */
    protected function getPageImage(Request $request): string
    {
        // You can make this dynamic per article too
        return asset('images/og-image.jpg');
    }
}
