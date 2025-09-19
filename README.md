## What is this?

This is yet another experiment blog of mine. This iteration is a VILT stack (vue, laravel, inertia, tailwind) that is working with Vercel to load everything. Yes there's the whole mystery of how I'm running a server based PHP project with serverless hosting in Vercel. It's also pretty cool how I can ~~take all of my data from the github repo via github's api~~ use a sqlite db that's uploaded with the project for all of my data needs with no need for extra services to host said database.

The graph feature is fun to use. I write all of my articles in the articles folder and there's a graph folder which holds my thoughts. From here, all I need to do is run the content seeder which will populate my sqlite database with the articles, thoughts and connections to then use by laravel. 

    php artisan db:seed --class=ContentSeeder