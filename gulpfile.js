var gulp = require('gulp');
var source = require('vinyl-source-stream');
var watchify = require('watchify');
var browserify = require('browserify');
var reactify = require('reactify');
var plugins = require("gulp-load-plugins")();


var bundler = watchify(browserify('./public/javascripts/index.js', watchify.args).transform(reactify));
bundler.on('update', bundle);
bundler.on('log', plugins.util.log);


function bundle() {
  return bundler.bundle()
    // log errors
    .on('error', plugins.util.log.bind(plugins.util, 'Browserify Error'))
    .pipe(source('index.js'))
    // build sourcemaps
    .pipe(require('vinyl-buffer')())
    .pipe(plugins.sourcemaps.init({loadMaps: true})) // loads map from browserify file
    .pipe(plugins.sourcemaps.write('./')) // writes .map file
    .pipe(gulp.dest('./public/dest'));
}


gulp.task('jshint', function() {
  return gulp.src('./public/javascripts/**/*.js')
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter('default'));
});


gulp.task('scss:lint', function() {
  gulp.src('./public/scss/**/*.scss')
    .pipe(plugins.scssLint());
});


gulp.task('scss:compileDev', function() {
  gulp.src('./public/scss/**/*.scss')
    //build sourcemaps
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.sass({errLogToConsole: true}))
    .pipe(plugins.sourcemaps.write())
    .pipe(gulp.dest('./public/css'));
});


gulp.task('scss:compile', ['fonts:copy'], function() {
  gulp.src('./public/scss/**/*.scss')
    .pipe(plugins.sass({errLogToConsole: true}))
    .pipe(gulp.dest('./public/css'));
});


gulp.task('css:minify', ['scss:compile'], function() {
  gulp.src('./public/css/*.css')
    .pipe(plugins.minifyCss())
    .pipe(gulp.dest('./public/css'));
});


gulp.task('js:develop', ['jshint'], function() {
  bundle();
});


gulp.task('js:compress', ['js:browserify'], function() {
  gulp.src('./public/dest/index.js')
    .pipe(plugins.uglify())
    .pipe(gulp.dest('./public/dest'));
});


gulp.task('js:browserify', function() {
  var b = browserify('./public/javascripts/index.js')
    .transform(reactify);

  b.bundle()
    .pipe(source('index.js'))
    .pipe(gulp.dest('./public/dest'));
});


gulp.task('scss:develop', ['scss:lint', 'scss:compileDev']);


gulp.task('fonts:copy', function() {
  gulp.src(['./node_modules/font-awesome/fonts/*', './node_modules/bootstrap-sass/assets/fonts/bootstrap/*'])
    .pipe(gulp.dest('./public/dest/fonts'));
});


gulp.task('css:copy', function() {
  gulp.src('./node_modules/css-toggle-switch/dist/**/*')
    .pipe(gulp.dest('./public/css/css-toggle-switch'));
});


gulp.task('develop', function() {
  var server = plugins.liveServer.new('bin/www');
  server.start();

  //watch for sass changes
  gulp.watch(['public/scss/**/*.scss'], ['scss:develop']);

  //watch for jsx changes
  gulp.watch([
    'public/jsx/**/*.jsx',
    'public/javascripts/**/*.js'
  ], ['js:develop']);

  //watch for front-end changes
  gulp.watch([
    'public/dest/**/*.js',
    'public/css/**/*.css',
    'public/images/**/*',
    'views/**/*.jade'
  ], server.notify);

  //watch for back-end js changes
  gulp.watch([
    'app.js',
    'routes/**/*.js',
    'libs/**/*.js'
  ], server.start);
});


gulp.task('build', [
  'fonts:copy',
  'css:copy',
  'css:minify',
  'js:compress'
]);
