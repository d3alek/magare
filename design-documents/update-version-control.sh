REV=$1
JS1="$(tr -d "\n" < $2)"
JS2="$(tr -d "\n" < $3)"
#curl -H "Content-Type: application/json" -X PUT http://$HOST/garden/_design/version-control -d "{\"_id\":\"_design/version-control\",\"updates\":\"$JS1\",\"validate_doc_update\":\"$JS2\"}"
curl -H "Content-Type: application/json" -X PUT http://$HOST/garden/_design/version-control -d "{\"language\":\"javascript\",\"_rev\":\"$1\",\"updates\":{\"update\":\"$JS1\"},\"validate_doc_update\":\"$JS2\"}"
