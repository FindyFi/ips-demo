# International Patient Summary as a digital credential in a digital wallet

Demo: Issue International Patient Summary credential using Procivis One Core.

Based on [Procivis One Core API Reference](https://docs.procivis.ch/reference/core/procivis-one-core-api).

Test a [running instance](https://ips-demo.trustregistry.eu/) with the [Procivis Wallet](https://www.procivis.ch/components/procivis-one-wallet).

## Environment variables

You should have the following environment variables set to run the app:

You can install your own installation of the Procivis One Core and use your preferred method to secure the endpoints.
These example variables assume that you have an access to the Procivis trial environment.

```sh
export IPS_PROJECT_NAME="ips-demo"
export IPS_API_BASE="https://api.trial.procivis-one.com/api"
export IPS_API_TOKEN=""
export IPS_TOKEN_ENDPOINT="https://keycloak.trial.procivis-one.com/realms/trial/protocol/openid-connect/token"
export IPS_CLIENT_ID="<YOUR CLIENT ID>"
export IPS_CLIENT_SECRET="<YOUR CLIENT SECRET>"
export IPS_SERVER_HOST="localhost"
export IPS_ISSUER_HOST="<YOUR PUBLIC HOSTNAME>"
export IPS_VCT_ID="PatientSummary-2026-01-19"
export IPS_VCT_URL="https://ips.todiste.fi/credentials/v1/PatientSummary.json"
export IPS_ISSUER_PORT=4773
```

## EPIC integration

If you have your own EPIC instance or if you are targeting a specific environment, set the
environment variables accordingly.

You can also use the EPIC sandbox by registering your client at [fhir.epic.com](https://fhir.epic.com/).
The example variables below assume you're using the sandbox.

```sh
export EPIC_CLIENT_ID="<YOUR CLIENT ID>"
export EPIC_CLIENT_SECRET="<YOUR CLIENT SECRET>"
export EPIC_OAUTH_ENDPOINT="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize"
export EPIC_TOKEN_ENDPOINT="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token"
export EPIC_API_ENDPOINT="https://fhir.epic.com/interconnect-fhir-oauth/api"
```

### Testing the EPIC integration

You can use the service as one of the EPIC [test patients](https://fhir.epic.com/Documentation?docId=testpatients).

## Running the service

When you have the environment variables in place, you can start the service with the following commands:

```sh
npm install
node server.js
```

If you want to keep the service running, you might want to use a process manager like PM2:

```sh
npm install -g pm2
npm install
pm2 start --name 'IPS demo' server.js
pm2 save
```
