echo "Creating AWS Keras Lambda Deployment Zip"

BASEDIR=$(readlink -f "$(dirname $0)/../..")
echo "basedir is $BASEDIR"

if [[ ! -d $BASEDIR/keras_deploy ]]; then
    mkdir "$BASEDIR/keras_deploy"
fi

ZIPFILE="$1"
if [[ -z $ZIPFILE ]]; then
	>&2 echo "Usage: $0 <ZIPFILE>"
	exit 1
fi
ZIPFILE=$(readlink -f "$ZIPFILE")

echo "Archiving to $ZIPFILE"
rm -f "$ZIPFILE"

cp -r $BASEDIR/../../keras_build $BASEDIR/build
cp $BASEDIR/keras_handler.py $BASEDIR/build/keras_handler.py

cd $BASEDIR/build

zip -r -9 -q "$ZIPFILE" ./*

echo "Written to $ZIPFILE"
