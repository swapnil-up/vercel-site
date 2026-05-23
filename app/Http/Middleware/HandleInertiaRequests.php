<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
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
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     * @param  \Illuminate\Http\Request  $request
     * @return array
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
        $post = \App\Models\Post::where('slug', $slug)->first();
        return $post ? $post->title . ' - Swapnil Upadhyay' : 'Article - Swapnil Upadhyay';
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
        $post = \App\Models\Post::where('slug', $slug)->first();
        return $post
            ? ($post->description ?? substr(strip_tags($post->content), 0, 160))
            : 'Read this article on Swapnil Upadhyay\'s blog';
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