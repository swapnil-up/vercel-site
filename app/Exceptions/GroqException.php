<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A failed Groq request, carrying whether it is worth retrying and whether
 * the run should stop entirely (bad key / retired model).
 */
class GroqException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $status = 0,
        public readonly bool $retryable = false,
        public readonly bool $fatal = false,
        public readonly ?float $retryAfter = null,
    ) {
        parent::__construct($message, $status);
    }
}
