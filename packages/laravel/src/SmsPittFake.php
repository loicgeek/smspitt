<?php

namespace NtechServices\SmsPitt;

use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Assert;

class SmsPittFake
{
    private static function apiUrl(): string
    {
        return rtrim(config('smspitt.url', 'http://localhost:2877'), '/') . '/api/v1';
    }

    /** @return array<int, array<string, mixed>> */
    public static function messages(?string $to = null): array
    {
        $url = self::apiUrl() . '/messages';
        if ($to) $url .= '?' . http_build_query(['to' => $to]);
        return Http::get($url)->json('messages', []);
    }

    public static function reset(): void
    {
        Http::delete(self::apiUrl() . '/messages');
    }

    public static function assertSentTo(string $to, ?\Closure $callback = null): void
    {
        $messages = self::messages($to);

        Assert::assertNotEmpty(
            $messages,
            "No SMS was sent to [{$to}]."
        );

        if ($callback !== null) {
            $matching = array_filter($messages, fn ($sms) => $callback((object) $sms));
            Assert::assertNotEmpty(
                $matching,
                "No SMS sent to [{$to}] matched the given assertion."
            );
        }
    }

    public static function assertCount(int $expected): void
    {
        $count = count(self::messages());
        Assert::assertSame(
            $expected,
            $count,
            "Expected {$expected} SMS message(s) but found {$count}."
        );
    }

    public static function assertNothingSent(): void
    {
        $count = count(self::messages());
        Assert::assertSame(0, $count, "Expected no SMS messages but found {$count}.");
    }

    public static function assertBodyContains(string $to, string $needle): void
    {
        $messages = self::messages($to);
        Assert::assertNotEmpty($messages, "No SMS was sent to [{$to}].");
        $found = array_filter($messages, fn ($m) => str_contains($m['body'] ?? '', $needle));
        Assert::assertNotEmpty($found, "No SMS sent to [{$to}] contains [{$needle}].");
    }
}
