<?php

namespace App\Http\Controllers;

use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;

class RotaMinutesController extends Controller
{
    public function create()
    {
        $defaults = [];
        $defaultsPath = resource_path('rota/assets/rota-defaults.json');
        if (file_exists($defaultsPath)) {
            $defaults = json_decode(file_get_contents($defaultsPath), true) ?? [];
        }

        return inertia('Tools/RotaMinutes', [
            'meta' => [
                'title' => 'Meeting Minutes — Tools — Swapnil Upadhyay',
                'description' => 'Create and save meeting minutes PDFs for any club or organisation.',
            ],
            'config' => config('rota'),
            'defaults' => $defaults,
        ]);
    }

    public function generateFromForm(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|in:general,board',
            'meeting_number' => 'required|integer|min:1',
            'date' => 'required|date_format:Y-m-d',
            'time_from' => 'required|string',
            'time_to' => 'required|string',
            'venue' => 'required|string',
            'minute_taker' => 'required|string',
            'year' => 'required|string',
            'club_name' => 'required|string',
            'club_number' => 'required|string',
            'rid' => 'required|string',
            'president' => 'required|string',
            'member_prefix' => 'required|string',
            'footer_note' => 'required|string',
            'sig_left_name' => 'required|string',
            'sig_left_title' => 'required|string',
            'sig_right_name' => 'required|string',
            'sig_right_title' => 'required|string',
            'attendance' => 'present|array',
            'attendance.*.name' => 'required|string',
            'attendance.*.designation' => 'required|string',
            'attendance.*.present' => 'required|boolean',
            'happy_sad' => 'present|array',
            'happy_sad.*' => 'string',
            'agenda' => 'present|array',
            'agenda.*.title' => 'required|string',
            'agenda.*.body' => 'required|string',
            'recurring_items' => 'present|array',
            'recurring_items.*' => 'string',
            'summary_proposed' => 'required|integer|min:0',
            'summary_rotarians' => 'required|integer|min:0',
            'summary_visiting_rotaractors' => 'required|integer|min:0',
            'summary_visiting_interactors' => 'required|integer|min:0',
            'summary_guests' => 'required|integer|min:0',
            'letterhead_data' => 'nullable|string',
            'sig_left_data' => 'nullable|string',
            'sig_right_data' => 'nullable|string',
            'stamp_data' => 'nullable|string',
        ]);

        $total = count(array_filter($data['attendance'], fn($a) => $a['present']))
            + (int)$data['summary_proposed']
            + (int)$data['summary_rotarians']
            + (int)$data['summary_visiting_rotaractors']
            + (int)$data['summary_visiting_interactors']
            + (int)$data['summary_guests'];

        $templateFile = $data['type'] === 'general' ? 'gm_template.html' : 'bm_template.html';
        $html = file_get_contents(resource_path("rota/templates/dompdf/{$templateFile}"));

        $prefix = $data['member_prefix'];
        $clubName = $data['club_name'];

        $attRows = '';
        $i = 1;
        foreach ($data['attendance'] as $m) {
            if ($m['present']) {
                $attRows .= "<tr><td>{$i}.</td><td>{$prefix} {$m['name']}</td><td>{$clubName}</td><td>{$m['designation']}</td></tr>";
                $i++;
            }
        }

        $happyLines = '';
        foreach ($data['happy_sad'] as $item) {
            if (trim($item) !== '') {
                $happyLines .= '<p class="body-text">&bull; ' . htmlspecialchars($item, ENT_QUOTES, 'UTF-8') . '</p>';
            }
        }

        $agendaHtml = '';
        foreach ($data['agenda'] as $idx => $item) {
            $num = $idx + 1;
            $agendaHtml .= "<p class=\"agenda-title\">{$num}. {$item['title']}</p>";
            $agendaHtml .= "<p class=\"agenda-body\">{$item['body']}</p>";
        }
        foreach ($data['recurring_items'] as $item) {
            if (trim($item) !== '') {
                $agendaHtml .= '<p class="agenda-body">- ' . htmlspecialchars($item, ENT_QUOTES, 'UTF-8') . '</p>';
            }
        }

        $dateStr = $this->formatDate($data['date']);

        $subs = [
            '{YEAR}' => $data['year'],
            '{MEMBER_PREFIX}' => $prefix,
            '{PRESIDENT}' => $data['president'],
            '{CLUB_NAME}' => $clubName,
            '{CLUB_NUMBER}' => $data['club_number'],
            '{RID}' => $data['rid'],
            '{VENUE}' => $data['venue'],
            '{FOOTER_NOTE}' => $data['footer_note'],
            '{LETTERHEAD_HTML}' => $data['letterhead_data']
                ? '<div style="position: fixed; top: 0; left: 0; width: 100%;"><img src="' . $data['letterhead_data'] . '" style="width: 100%; display: block;" alt="Letterhead"/></div>'
                : '',
            '{BODY_PADDING_TOP}' => $data['letterhead_data'] ? '1.7in' : '0',
            '{SIG_LEFT_IMAGE}' => $data['sig_left_data'] ?? '',
            '{SIG_LEFT_NAME}' => $data['sig_left_name'],
            '{SIG_LEFT_TITLE}' => $data['sig_left_title'],
            '{SIG_RIGHT_IMAGE}' => $data['sig_right_data'] ?? '',
            '{SIG_RIGHT_NAME}' => $data['sig_right_name'],
            '{SIG_RIGHT_TITLE}' => $data['sig_right_title'],
            '{STAMP_IMAGE}' => $data['stamp_data'] ?? '',
            '{GM_NUMBER}' => (string)$data['meeting_number'],
            '{BM_NUMBER}' => (string)$data['meeting_number'],
            '{DATE}' => $dateStr,
            '{TIME_FROM}' => $data['time_from'],
            '{TIME_TO}' => $data['time_to'],
            '{MINUTE_TAKER}' => $data['minute_taker'],
            '{ATTENDANCE_TABLE}' => $attRows ? '<table class="attendance-table"><tr><th>S.N.</th><th>Name</th><th>Club</th><th>Designation</th></tr>' . $attRows . '</table>' : '<p>No attendance recorded.</p>',
            '{HAPPY_SAD_ITEMS}' => $happyLines ?: '<p class="body-text">No happy &amp; sad news shared.</p>',
            '{AGENDA_ITEMS}' => $agendaHtml ?: '<p class="body-text">No agenda items.</p>',
            '{SUMMARY_FROM}' => $data['time_from'],
            '{SUMMARY_TO}' => $data['time_to'],
            '{SUMMARY_PROPOSED}' => (string)$data['summary_proposed'],
            '{SUMMARY_ROTARIANS}' => (string)$data['summary_rotarians'],
            '{SUMMARY_VISITING_ROTARACTORS}' => (string)$data['summary_visiting_rotaractors'],
            '{SUMMARY_VISITING_INTERACTORS}' => (string)$data['summary_visiting_interactors'],
            '{SUMMARY_GUESTS}' => (string)$data['summary_guests'],
            '{SUMMARY_TOTAL}' => (string)$total,
        ];

        $type = $data['type'] === 'general' ? 'GM' : 'BM';
        return $this->buildPdf($html, $subs, $type, $data['meeting_number']);
    }

    private function buildPdf(string $html, array $subs, string $type, int $number)
    {
        $html = str_replace(array_keys($subs), array_values($subs), $html);
        $html = preg_replace('/<img[^>]*src=""[^>]*>/', '', $html);

        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', false);
        $options->set('isFontSubsettingEnabled', false);
        $options->set('tempDir', sys_get_temp_dir());
        $options->set('fontDir', sys_get_temp_dir());
        $options->set('fontCache', sys_get_temp_dir());
        $options->set('logOutputFile', sys_get_temp_dir() . '/dompdf.log');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper([0, 0, 595.28, 841.89]);
        $dompdf->render();

        $pdfContent = $dompdf->output();
        $filename = "{$type}_{$number}.pdf";

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function formatDate(string $dateStr): string
    {
        $dt = \DateTime::createFromFormat('Y-m-d', $dateStr);
        return $dt->format('jS F, Y');
    }
}
