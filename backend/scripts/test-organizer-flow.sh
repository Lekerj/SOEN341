#!/usr/bin/env bash
# Automated curl test script for organizer request -> admin approval -> event creation flow.
# Usage: bash backend/scripts/test-organizer-flow.sh [PORT]
# Default PORT=3000 (override by passing first arg, e.g. 3001)
# Requires server running: PORT=3001 node backend/server.js

set -euo pipefail
PORT="${1:-3000}"
BASE="http://localhost:${PORT}"

echo "== Using backend at $BASE =="

# Clean old cookies
rm -f organizer.cookies admin.cookies || true

step() { echo -e "\n---- $1 ----"; }

step "Login organizer (unapproved)"
curl -s -i -c organizer.cookies -H 'Content-Type: application/json' \
  -d '{"email":"organizer@test.com","password":"Organizer123!"}' \
  "$BASE/api/auth/login" | grep -E 'HTTP/|{"message"|{"error"' || true

step "Check organizer status before request"
curl -s -b organizer.cookies "$BASE/api/organizer/status" | jq . || curl -s -b organizer.cookies "$BASE/api/organizer/status"

step "List organizations (show first few)"
curl -s "$BASE/api/organizer/organizations" | jq '.organizations[:5]' || curl -s "$BASE/api/organizer/organizations"

ORG_ID=1
step "Submit organizer request to join organization id=$ORG_ID"
curl -s -b organizer.cookies -H 'Content-Type: application/json' \
  -d '{"organization_id":'"$ORG_ID"',"details":"Testing automation"}' \
  "$BASE/api/organizer/request" | jq . || true

step "Fetch organizer request history"
curl -s -b organizer.cookies "$BASE/api/organizer/requests" | jq .requests || curl -s -b organizer.cookies "$BASE/api/organizer/requests"

step "Attempt event creation before approval (should 403)"
curl -s -i -b organizer.cookies -H 'Content-Type: application/json' \
  -d '{"title":"Pre-approval Fail","description":"Should not work","event_date":"2025-12-01","event_time":"10:00:00","location":"Room 1","capacity":50,"price":0,"organization":"Dummy","category":"academic"}' \
  "$BASE/api/organizer/events" | grep HTTP || true

step "Login admin"
curl -s -i -c admin.cookies -H 'Content-Type: application/json' \
  -d '{"email":"admin@concordia.ca","password":"Admin123!"}' \
  "$BASE/api/auth/login" | grep -E 'HTTP/|{"message"|{"error"' || true

step "Admin lists pending organizer requests"
PENDING=$(curl -s -b admin.cookies "$BASE/api/admin/organizer/requests")
echo "$PENDING" | jq '.requests' || echo "$PENDING"
REQ_ID=$(echo "$PENDING" | jq -r '.requests[0].id' 2>/dev/null || true)
if [ -z "$REQ_ID" ] || [ "$REQ_ID" = "null" ]; then echo "No pending request found - aborting approval test"; exit 0; fi

step "Admin approves request id=$REQ_ID assigning role 'Event Manager'"
curl -s -i -b admin.cookies -H 'Content-Type: application/json' \
  -X PATCH -d '{"decision":"approved","role":"Event Manager"}' \
  "$BASE/api/admin/organizer/requests/$REQ_ID/decision" | grep HTTP || true

step "Organizer re-checks status (should be approved)"
curl -s -b organizer.cookies "$BASE/api/organizer/status" | jq . || curl -s -b organizer.cookies "$BASE/api/organizer/status"

step "Organizer lists memberships"
curl -s -b organizer.cookies "$BASE/api/organizer/memberships" | jq . || curl -s -b organizer.cookies "$BASE/api/organizer/memberships"

step "Organizer creates event after approval"
curl -s -b organizer.cookies -H 'Content-Type: application/json' \
  -d '{"title":"Post-Approval Event","description":"Now allowed","event_date":"2025-12-05","event_time":"14:30:00","location":"Main Hall","capacity":120,"price":0,"organization":"Concordia Tech Society","category":"academic"}' \
  "$BASE/api/organizer/events" | jq . || true

step "List organizer events (should include new one)"
curl -s -b organizer.cookies "$BASE/api/organizer/events" | jq '.events | map({id,title,organization,event_date})' || curl -s -b organizer.cookies "$BASE/api/organizer/events"

step "Done"
