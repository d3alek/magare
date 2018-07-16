WEBAPP=$1
USER=$2
PASS=$3
echo "Pushing $WEBAPP"
EXISTS=$(curl -s -o /dev/null -w "%{http_code}" -I https://magare.otselo.eu/webapps/$WEBAPP)
echo "Exists? $EXISTS"
if [ "$EXISTS" -eq "404" ]; then
  echo "Making new document $WEBAPP"
  SUCCESS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT -H "Content-Type: application/json" https://$USER:$PASS@magare.otselo.eu/webapps/$WEBAPP -d '{}')
  echo "Success? $SUCCESS"
  if [ "$SUCCESS" -ne "202" ]; then
    exit 1
  fi
fi

REV=$(curl https://magare.otselo.eu/webapps/$1 | python -c "import sys, json; print(json.load(sys.stdin)['_rev'])")

echo "Revision $REV"

cd $WEBAPP && npm run-script build && cd ..

SUCCESS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT -H "Content-Type: text/html" https://$USER:$PASS@magare.otselo.eu/webapps/$WEBAPP/index.html?rev=$REV -d @$WEBAPP/dist/index.html)
echo "index.html success? $SUCCESS"

if [ "$SUCCESS" -ne "202" ]; then
  exit 1
fi

REV=$(curl https://magare.otselo.eu/webapps/$1 | python -c "import sys, json; print(json.load(sys.stdin)['_rev'])")

SUCCESS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT -H "Content-Type: application/x-javascript" https://$USER:$PASS@magare.otselo.eu/webapps/$WEBAPP/bundle.js?rev=$REV -d @$WEBAPP/dist/bundle.js)
echo "bundle.js success? $SUCCESS"

if [ "$SUCCESS" -ne "202" ]; then
  exit 1
fi

echo "Done"

