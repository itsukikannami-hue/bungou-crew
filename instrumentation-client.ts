import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    beforeSend(event) {
      // Do not transmit potentially sensitive URLs or user-entered text.
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
        delete event.request.query_string;
        delete event.request.url;
      }
      return event;
    },
  });
}
