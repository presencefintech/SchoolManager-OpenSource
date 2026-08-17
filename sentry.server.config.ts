import * as Sentry from '@sentry/nextjs'
import { buildSentryInitOptions } from './src/lib/observability/sentry-options'

Sentry.init(buildSentryInitOptions('server'))
