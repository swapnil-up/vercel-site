<?php

// 1. Scraper Script - run this independently to extract data
// scrape_gotra_data.php

require_once __DIR__ . '/../vendor/autoload.php';

use GuzzleHttp\Client;
use Symfony\Component\DomCrawler\Crawler;

class GotraScraper
{
    private $client;
    private $baseUrl = 'https://blog.hinduculturecenter.com/astrology/100-nepali-thar-and-their-gotra-list/';
    
    public function __construct()
    {
        $this->client = new Client([
            'timeout' => 30,
            'headers' => [
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            ]
        ]);
    }
    
    public function scrapeGotraData(): array
    {
        try {
            echo "Fetching data from: {$this->baseUrl}\n";
            
            $response = $this->client->get($this->baseUrl);
            $html = (string) $response->getBody();
            
            $crawler = new Crawler($html);
            
            $gotraData = [];
            
            // Fix 2: Select all tables with the specific class
            $tables = $crawler->filter('figure.wp-block-table table');
            
            // Loop through the first 8 tables only, as you specified
            $tables->slice(0, 8)->each(function (Crawler $table) use (&$gotraData) {
                
                $rows = $table->filter('tr');
                
                // Fix 3: Skip the header row (first row)
                $rows->each(function (Crawler $row, $rowIndex) use (&$gotraData) {
                    if ($rowIndex === 0) {
                        return; // Skip the header row
                    }
                    
                    $cells = $row->filter('td');
                    
                    if ($cells->count() >= 2) {
                        $surname = trim($cells->eq(0)->text());
                        $gotra = trim($cells->eq(1)->text());
                        
                        // Fix 4: Validate and process the data
                        if (!empty($surname) && !empty($gotra)) {
                            $this->processGotraRow($gotraData, $surname, $gotra);
                        }
                    }
                });
            });
            
            echo "Extracted data for " . count($gotraData) . " gotras\n";
            
            return $gotraData;
            
        } catch (\Exception $e) {
            echo "Error scraping data: " . $e->getMessage() . "\n";
            return [];
        }
    }
    
    // Fix 5: Introduce a single, simplified processing method
    private function processGotraRow(array &$gotraData, string $surname, string $gotra): void
    {
        // Trim and clean the names
        $gotra = $this->cleanName($gotra);
        $surname = $this->cleanName($surname);
        
        // Skip common header-like rows that might have slipped through
        if (strtolower($surname) === 'thar (surname)') {
            return;
        }

        if (!isset($gotraData[$gotra])) {
            $gotraData[$gotra] = [
                'name' => $gotra,
                'description' => $this->generateGotraDescription($gotra),
                'pravara' => '', // Pravara is not in these tables
                'surnames' => [],
            ];
        }
        
        // Handle multiple surnames in a single cell, e.g., "Bantawa, Chamling, Kulung"
        $surnames = explode(',', $surname);
        foreach ($surnames as $s) {
            $cleanedSurname = $this->cleanName($s);
            if (!empty($cleanedSurname)) {
                $gotraData[$gotra]['surnames'][] = [
                    'surname' => $cleanedSurname,
                    'variant' => null,
                    'region' => null,
                    'subcaste' => null,
                ];
            }
        }
    }

    private function cleanName(string $name): string
    {
        // Clean up whitespace and special characters
        return trim(preg_replace('/\s+/', ' ', $name));
    }
    
    // This method remains as before
    private function generateGotraDescription(string $gotraName): string
    {
        $descriptions = [
            'Atri' => 'One of the seven great sages (Saptarishi), father of Durvasa and Dattatreya',
            'Bharadwaja' => 'One of the seven great sages, known for wisdom and learning',
            'Kashyapa' => 'One of the seven great sages, considered father of all living beings',
            'Vashishtha' => 'One of the seven great sages, royal guru of the Raghu dynasty',
            'Vishvamitra' => 'Great sage who transformed from Kshatriya to Brahmin through penance',
            'Gautam' => 'Founder of Nyaya philosophy, known for logical reasoning',
            'Kaudinya' => 'First disciple of Buddha, represents enlightenment and wisdom',
            'Kaushika' => 'Lineage of Vishwamitra, known for spiritual transformation and power',
            'Garga' => 'Court astrologer of King Nanda, expert in astronomy and mathematics',
            'Mandavya' => 'Sage known for his truthfulness and commitment to justice',
            'Maudgalya' => 'Descendant of sage Mudgala, known for righteousness',
            'Dhananjaya' => 'Sage representing prosperity and victory in spiritual pursuits',
            'Upamanyu' => 'Student of Ayoda-Dhaumya, known for devotion and perseverance',
            'Vatsa' => 'Ancient sage lineage associated with prosperity and spiritual growth',
            'Shandilya' => 'Sage known for devotional practices and spiritual texts',
            'Bhargava' => 'Descendant of sage Bhrigu, known for astrological knowledge',
            'Angira' => 'One of the Saptarishi, associated with fire sacrifices and Vedic hymns',
            'Jamadagni' => 'One of the seven great sages, father of Parashurama',
            'Parashara' => 'Father of Ved Vyasa, author of many Puranas and astrological texts',
            'Agastya' => 'One of the seven great sages, known for his role in southern India',
            'Ghritakaushika' => 'Sub-lineage of Kaushika, known for ritual knowledge'
        ];
        
        return $descriptions[$gotraName] ?? "Ancient sage lineage with rich spiritual heritage";
    }
    
    public function saveToJson(array $data, string $filename = 'gotra_data.json'): void
    {
        file_put_contents($filename, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo "Data saved to {$filename}\n";
    }
    
    public function generateSeederFile(array $data, string $filename = 'GotraSeeder.php'): void
    {
        $seederContent = $this->generateSeederContent($data);
        file_put_contents($filename, $seederContent);
        echo "Seeder file generated: {$filename}\n";
    }
    
    private function generateSeederContent(array $data): string
    {
        $content = "<?php\n\n";
        $content .= "namespace Database\\Seeders;\n\n";
        $content .= "use Illuminate\\Database\\Seeder;\n";
        $content .= "use App\\Models\\Gotra;\n";
        $content .= "use App\\Models\\SurnameGotra;\n";
        $content .= "use Illuminate\\Support\\Facades\\DB;\n\n";
        $content .= "class GotraSeeder extends Seeder\n{\n";
        $content .= "    public function run()\n    {\n";
        $content .= "        // Disable foreign key checks during seeding\n";
        $content .= "        DB::statement('SET FOREIGN_KEY_CHECKS=0;');\n\n";
        $content .= "        // Clear existing data\n";
        $content .= "        SurnameGotra::truncate();\n";
        $content .= "        Gotra::truncate();\n\n";
        $content .= "        // Comprehensive Nepali Gotra data scraped from authoritative sources\n";
        $content .= "        \$gotrasData = [\n";
        
        foreach ($data as $gotraName => $gotraInfo) {
            $content .= "            [\n";
            $content .= "                'name' => '" . addslashes($gotraInfo['name']) . "',\n";
            $content .= "                'description' => '" . addslashes($gotraInfo['description']) . "',\n";
            $content .= "                'pravara' => '" . addslashes($gotraInfo['pravara']) . "',\n";
            $content .= "                'surnames' => [\n";
            
            foreach ($gotraInfo['surnames'] as $surnameData) {
                $content .= "                    [\n";
                $content .= "                        'surname' => '" . addslashes($surnameData['surname']) . "',\n";
                $content .= "                        'variant' => " . ($surnameData['variant'] ? "'" . addslashes($surnameData['variant']) . "'" : 'null') . ",\n";
                $content .= "                        'region' => " . ($surnameData['region'] ? "'" . addslashes($surnameData['region']) . "'" : 'null') . ",\n";
                $content .= "                        'subcaste' => " . ($surnameData['subcaste'] ? "'" . addslashes($surnameData['subcaste']) . "'" : 'null') . ",\n";
                $content .= "                    ],\n";
            }
            
            $content .= "                ],\n";
            $content .= "            ],\n";
        }
        
        $content .= "        ];\n\n";
        $content .= "        foreach (\$gotrasData as \$gotraData) {\n";
        $content .= "            \$gotra = Gotra::create([\n";
        $content .= "                'name' => \$gotraData['name'],\n";
        $content .= "                'description' => \$gotraData['description'],\n";
        $content .= "                'pravara' => \$gotraData['pravara']\n";
        $content .= "            ]);\n\n";
        $content .= "            foreach (\$gotraData['surnames'] as \$surnameData) {\n";
        $content .= "                SurnameGotra::create([\n";
        $content .= "                    'surname' => \$surnameData['surname'],\n";
        $content .= "                    'gotra_id' => \$gotra->id,\n";
        $content .= "                    'variant' => \$surnameData['variant'],\n";
        $content .= "                    'region' => \$surnameData['region'],\n";
        $content .= "                    'subcaste' => \$surnameData['subcaste']\n";
        $content .= "                ]);\n";
        $content .= "            }\n";
        $content .= "        }\n\n";
        $content .= "        // Re-enable foreign key checks\n";
        $content .= "        DB::statement('SET FOREIGN_KEY_CHECKS=1;');\n\n";
        $content .= "        \$this->command->info('Seeded ' . count(\$gotrasData) . ' gotras with their surname mappings.');\n";
        $content .= "    }\n";
        $content .= "}\n";
        
        return $content;
    }
}

// 2. CLI script to run the scraper
if (php_sapi_name() === 'cli') {
    echo "Nepali Gotra Data Scraper\n";
    echo "========================\n\n";
    
    $scraper = new GotraScraper();
    
    echo "Starting scrape...\n";
    $data = $scraper->scrapeGotraData();
    
    if (!empty($data)) {
        echo "\nScraping completed successfully!\n";
        
        // Save raw JSON data
        $scraper->saveToJson($data);
        
        // Generate Laravel seeder
        $scraper->generateSeederFile($data);
        
        // Print summary
        echo "\nSummary:\n";
        echo "--------\n";
        $totalSurnames = 0;
        foreach ($data as $gotra => $info) {
            $surnameCount = count($info['surnames']);
            echo "• {$gotra}: {$surnameCount} surnames\n";
            $totalSurnames += $surnameCount;
        }
        echo "\nTotal: " . count($data) . " gotras, {$totalSurnames} surname mappings\n";
        
        // Show sample data
        echo "\nSample data:\n";
        $first = array_slice($data, 0, 2);
        foreach ($first as $gotra => $info) {
            echo "\n{$gotra}:\n";
            echo "  Description: {$info['description']}\n";
            echo "  Pravara: {$info['pravara']}\n";
            echo "  Sample surnames: " . implode(', ', array_slice(array_column($info['surnames'], 'surname'), 0, 5)) . "\n";
        }
        
    } else {
        echo "\nScraping failed or returned no data.\n";
        echo "Please check the source URL and try again.\n";
    }
}

?>