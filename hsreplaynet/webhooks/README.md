## Webhooks

Webhooks allow users to set a URL that will be POSTed to every time a game is
successfully uploaded and processed on HSReplay.net.

The POSTed game data is in the same format as that found in `/api/v1/games/:shortid/`.


### API

API endpoint: `/api/v1/webhooks/:uuid/`. (API root: https://hsreplay.net/)
The API requires authentication, which can be done using OAuth2 (NYI) or a local session.

Webhook object description follows.

NOTE: All requests SHOULD include `X-Api-Key: <apikey>`.


#### Read+write attributes

- `url` (str) (required): The URL the webhook will hit.
- `is_active` (bool): If `is_active` is false, the webhook does not trigger.


#### Read-only attributes:

- `uuid`: The UUID of the webhook.
- `user`: An array that contains the ID of the user who owns the webhook
- `created`: When the webhook was created
- `modified`: When the webhook was last modified


#### Create a webhook

`HTTP POST /api/v1/webhooks/ {"url": "https://example.com/my-url/"}`

`url` is the only required parameter.

Returns the full webhook object


#### Delete a webhook

`HTTP DELETE /api/v1/webhooks/:uuid/`


#### Modify an existing webhook

`HTTP PATCH /api/v1/webhooks/<uuid>/ {"url": "https://example.com/new-url/"}`
