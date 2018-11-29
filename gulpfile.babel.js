import gulp from 'gulp';
import babel from 'gulp-babel';
import rename from 'gulp-rename';
import uglify from 'gulp-uglify';
import sass from 'gulp-sass';

const paths = {
  src: 'src/',
  dest: 'dist/',
};

gulp.task('babel', () => {
  return gulp.src(paths.src + '/**/*.js')
    .pipe(babel({
      "presets": ["es2015", "stage-0"],
      "plugins": [
        ["transform-es2015-modules-umd", {
          "globals": {
            "jquery": "jQuery"
          }
        }]
      ]
    }))
    .pipe(gulp.dest(paths.dest))
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(paths.dest));
});

gulp.task('sass', () => {
  return gulp.src(paths.src + '/**/*.scss')
    .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
    .pipe(gulp.dest(paths.dest));
});

gulp.task('deploy-babel', ['babel'], () => {
  return gulp.src(paths.dest + '/**/*.js')
});

gulp.task('deploy-sass', ['sass'], () => {
  return gulp.src(paths.dest + '/**/*.css')
});
gulp.task('deploy', ['deploy-babel', 'deploy-sass']);
gulp.task('default', ['deploy']);
gulp.task('watch', ['deploy'], () => {
  gulp.watch(paths.src.js, ['deploy-babel']);
  gulp.watch(paths.src.scss, ['deploy-sass']);
});