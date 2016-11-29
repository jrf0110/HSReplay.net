PROJECT="$HOME/hsreplay.net"
source "$HOME/env/bin/activate"
export PATH="$VIRTUAL_ENV/nodeenv/bin:$HOME/node_modules/.bin:$PATH"

# Kill remnants
killall -9 -q python node sassc fswatch

# https://fgimian.github.io/blog/2016/04/03/building-web-assets-using-shell-scripts (#89)

function build_css() {
	echo "Re-building SCSS files"
	sassc "$PROJECT/hsreplaynet/static/styles/main.scss" "$PROJECT/hsreplaynet/static/styles/main.css" \
	--sourcemap --source-comments
}

build_css
echo "Starting scss watcher"
fswatch -0 "$PROJECT/hsreplaynet/static/styles/" | while IFS= read -r -d "" path; do
	build_css
done &


echo "Starting webpack watcher"
webpack --verbose -d \
	--devtool cheap-module-eval-source-map \
	--config "$PROJECT/webpack.config.js" \
	--watch &

echo "Starting RQ Workers"
python "$PROJECT/manage.py" rqworker &

echo "Starting Django server"
python "$PROJECT/manage.py" runserver 0.0.0.0:8000
