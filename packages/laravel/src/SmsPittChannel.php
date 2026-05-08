<?php

namespace NtechServices\SmsPitt;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;

class SmsPittChannel
{
    public function __construct(private readonly string $url) {}

    public function send(mixed $notifiable, Notification $notification): void
    {
        $message = $notification->toSms($notifiable);

        Http::post($this->url . '/generic', [
            'to'      => $notifiable->routeNotificationFor('sms'),
            'from'    => $message->from ?? config('smspitt.default_from', ''),
            'message' => $message->content,
        ])->throw();
    }
}
