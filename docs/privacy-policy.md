# AgentTailor — Privacy Policy

**Last updated:** February 2026

## Overview

AgentTailor is a context assembly platform that helps AI assistants provide better answers by accessing your project documentation. This policy explains what data we collect, how we use it, and your rights.

## Data We Collect

### User Account Data
- Email address and name (via Clerk authentication)
- Account preferences and settings

### Project Data
- Project names and descriptions you create
- Documents you upload (text, markdown, PDF, code files)
- Document chunks and embeddings generated during processing

### Usage Data
- Task descriptions you submit for context tailoring
- Assembled context and quality scores from tailoring sessions
- Search queries and results

### Technical Data
- API request logs (timestamps, endpoints, response codes)
- Error logs for debugging

## How We Use Your Data

- **Context Assembly**: Your documents are chunked, embedded, and stored to enable semantic search and context tailoring.
- **Quality Improvement**: Tailoring sessions and quality scores help us improve the context assembly pipeline.
- **Account Management**: Email and auth data are used for authentication and account access.

## Data Storage and Security

- All data is encrypted at rest using industry-standard encryption.
- Data is scoped to your user account — other users cannot access your projects or documents.
- Database hosted on secure infrastructure with access controls and audit logging.

## Third-Party Services

We use the following third-party services to provide our functionality:

- **OpenAI** — For generating text embeddings (text-embedding-ada-002). Document chunks are sent to OpenAI's embedding API. Subject to [OpenAI's usage policies](https://openai.com/policies/usage-policies).
- **Tavily / Brave Search** — For web search when gap-filling is enabled. Search queries (derived from your task) are sent to these providers.
- **Clerk** — For user authentication. Subject to [Clerk's privacy policy](https://clerk.com/privacy).

## Your Rights

You have the right to:

- **Access**: View all your data via the AgentTailor dashboard.
- **Export**: Download your projects, documents, and tailoring history.
- **Delete**: Delete individual projects, documents, or your entire account. Account deletion removes all associated data permanently.
- **Opt Out**: Disable web search in your settings to prevent queries from being sent to search providers.

## Data Retention

- Active account data is retained as long as your account exists.
- Deleted projects and documents are permanently removed within 30 days.
- Account deletion triggers immediate removal of all user data.

## Contact

For privacy-related questions or requests, contact us at:

**Email**: privacy@agenttailor.com

## Changes to This Policy

We may update this privacy policy from time to time. Significant changes will be communicated via email to registered users.
