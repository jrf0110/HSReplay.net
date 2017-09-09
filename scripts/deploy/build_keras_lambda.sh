echo "Creating AWS Keras Lambda Deployment Zip"

BASEDIR=$(readlink -f "$(dirname $0)/../..")
echo "basedir is $BASEDIR"

ZIPFILE="$1"
if [[ -z $ZIPFILE ]]; then
	>&2 echo "Usage: $0 <ZIPFILE>"
	exit 1
fi
ZIPFILE=$(readlink -f "$ZIPFILE")

echo "Archiving to $ZIPFILE"
rm -f "$ZIPFILE"

cp $BASEDIR/keras_handler.py $BASEDIR/keras_build/keras_handler.py

cd $BASEDIR/keras_build

zip -r -9 -q "$ZIPFILE" ./*

echo "Written to $ZIPFILE"
