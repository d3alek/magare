REV=$1
DB=$2
USER_COLON_PASSWORD="$(tr -d "\n" < $3)"
JS1="$(tr -d "\n" < $4)"
JS2="$(tr -d "\n" < $5)"
HOST="https://$USER_COLON_PASSWORD@magare.otselo.eu:6984"
#Do this on first request
#curl -H "Content-Type: application/json" -X PUT $HOST/$DB/_design/version-control -d "{\"language\":\"javascript\", \"_id\":\"_design/version-control\",\"updates\":{\"update\":\"$JS1\"},\"validate_doc_update\":\"$JS2\"}"
curl -H "Content-Type: application/json" -X PUT $HOST/$DB/_design/version-control -d "{\"language\":\"javascript\",\"_rev\":\"$1\",\"updates\":{\"update\":\"$JS1\"},\"validate_doc_update\":\"$JS2\"}"
