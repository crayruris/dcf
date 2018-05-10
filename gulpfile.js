/**
 * ------------------
 * SETTING UP GULP
 * ------------------
 */
const pkg = require('./package.json'); // bring in properties specified in package.json
const gulp = require('gulp');
const path = require('path');
const commonPaths = require('./build-utils/common-paths');
const buildPaths = require('./build-utils/build-paths');
const buildNames = require('./build-utils/build-names');
const distPaths = require('./build-utils/dist-paths');
const distNames = require('./build-utils/dist-names');
const cascadeDelete = require('./build-utils/cascade-delete');
const concat = require('./build-utils/concat');
const customPlumber = require('./build-utils/custom-plumber');
const uglifyNewer = require('./build-utils/uglify');

// load all plugins in "devDependencies" into the variable $
const $ = require('gulp-load-plugins')({
  pattern: [ '*' ],
  scope: [ 'devDependencies' ]
});

const banner = [
  '/**',
  ' * @project        <%= pkg.name %>',
  ' * @author         <%= pkg.author %>',
  ` * @copyright      Copyright (c) ${ $.moment().format('YYYY') }, <%= pkg.license %>`,
  ' *',
  ' */',
  ''
].join('\n');

/**
 * ------------
 * GULP TASKS
 * ------------
 */

/* ----------------- */
/* STYLE LINT TASKS
/* ----------------- */
// TODO add style lint task

/* ----------------- */
/* ESLINT TASKS
/* ----------------- */
gulp.task('cachedLint', () => {
	$.fancyLog('----> //** Linting JS files in App (cached) 🌈');

	return gulp.src(buildPaths.appJsGlob)
			.pipe(customPlumber('Error Running esLint'))
			.pipe($.cached('eslint')) // Only uncached and changed files past this point
			.pipe($.eslint())
			.pipe($.eslint.format())
			.pipe($.eslint.result((result) => {
				if (result.warningCount > 0 || result.errorCount > 0) {
					delete $.cached.caches.eslint[path.resolve(result.filePath)]; // If a file has errors/warnings uncache it
				}
			}))
			.pipe($.eslint.failAfterError());
});

gulp.task('cachedLint-watch', () => {
	gulp.watch(buildPaths.appJsGlob, gulp.series('cachedLint'))
			.on('unlink', (ePath, stats) => {
				// code to execute on delete
				console.log(`${ePath} deleted - [cachedLint-watch]`);
				delete $.cached.caches.eslint[ePath]; // remove deleted files from cache
			});
});

/* ----------------- */
/* BABEL TASKS
/* ----------------- */
gulp.task('babel', () => {
	$.fancyLog('-> Transpiling ES6 via Babel... 🍕');

	return gulp.src(buildPaths.appJsGlob)
			.pipe(customPlumber('Error Running Babel'))
			.pipe($.debug({title: 'All Babel Files'})) // uncomment to see src files
			.pipe($.newer({ dest: buildPaths.appJsDest }))
			.pipe($.debug({title: 'Passed Through Babel Files'})) // uncomment to see src files
			.pipe($.babel({
				presets: [ 'env' ]
			}))
			.pipe(gulp.dest(buildPaths.appJsDest));
});

gulp.task('lintBabel-watch', () => {
	gulp.watch(buildPaths.appJsGlob, gulp.series('cachedLint', 'babel'))
			.on('unlink', (ePath, stats) => {
				// code to execute on delete
				console.log(`${ePath} deleted - [lintBabel-watch]`);
				cascadeDelete(ePath, stats, buildPaths.appJsDest, true);
			});
});

/* ----------------- */
/* SASS TASKS
/* ----------------- */
gulp.task('copySass', () => {
	$.fancyLog('----> //** Copying SCSS files');

	return gulp.src(distPaths.scssGlob)
			.pipe(gulp.dest(distPaths.scssDest));
});

gulp.task('copySass:newer', () => {
	$.fancyLog('----> //** Copying SCSS files');

	return gulp.src(distPaths.scssGlob)
			.pipe($.debug({title: 'All Files - [copySass:newer]'})) // uncomment to see src files
			.pipe($.newer(distPaths.scssDest))
			.pipe($.debug({title: 'Passed Through - [copySass:newer]'})) // uncomment to see if files are processed if min file is newer than src files
			.pipe(gulp.dest(distPaths.scssDest));
});

gulp.task('copySass-watch', () => {
	gulp.watch(distPaths.scssGlob, gulp.series('copySass:newer'))
		.on('unlink', (ePath, stats) => {
				// code to execute on delete
				console.log(`${ePath} deleted - [copySass-watch]`);
				cascadeDelete(ePath, stats, distPaths.scssDest, true);
			});
});

/* ----------------- */
/* VENDOR JS TASKS
/* ----------------- */
gulp.task('vendorConcat:newer', () => {
	// need to return the stream
  return concat.newer(buildPaths.vendorJsGlob, buildPaths.vendorJsDest, buildNames.vendorJs, 'vendorConcat:newer',  path.join(buildPaths.vendorJsDest, buildNames.vendorJs));
});

gulp.task('vendorUglify', () => {
	$.fancyLog('----> //** Building Dist Vendor JS Files');
	return uglifyNewer(distPaths.vendorJsSrc, distPaths.vendorJsDest, 'vendorUglify', path.join(distPaths.vendorJsDest, distNames.vendorMinJs));
});

gulp.task('vendorDist', gulp.series('vendorConcat:newer', 'vendorUglify'));

gulp.task('vendorDist-watch', () => {
	gulp.watch(buildPaths.vendorJsGlob, gulp.series('vendorConcat:newer', 'vendorUglify'))
			.on('unlink', (ePath, stats) => {
				// code to execute on delete
				console.log(`${ePath} deleted, recompiling ${buildNames.vendorMinJs} - [vendorDist-watch]`);
				concat.base(buildPaths.vendorJsGlob, buildPaths.vendorJsDest, buildNames.vendorJs, 'vendorConcat'); // if src files get deleted, force rebuild of dist file.
			});
});

/* ----------------- */
/* APP TASKS
/* ----------------- */
gulp.task('copyOptionalApp:newer', () => {
	$.fancyLog('----> //** Copying Optional App files');

	return gulp.src(distPaths.optionalAppGlob)
			.pipe($.debug({title: 'All Files - [copyOptionalApp:newer]'})) // uncomment to see src files
			.pipe($.newer({ dest:distPaths.optionalAppDest }))
			.pipe($.debug({title: 'Passed Through - [copyOptionalApp:newer]'})) // uncomment to see passed through files
			.pipe(gulp.dest(distPaths.optionalAppDest))

});

gulp.task('copyOptionalApp-watch', () => {
	gulp.watch(distPaths.optionalAppGlob, gulp.series('copyOptionalApp:newer'))
			.on('unlink', (ePath, stats) => {
				// code to execute on delete
				console.log(`${ePath} deleted - [copyOptionalApp-watch]`);
				cascadeDelete(ePath, stats, distPaths.optionalAppDest, false);
			});
});

gulp.task('commonAppConcat:newer', () => {
	return concat.newer(buildPaths.commonAppGlob, buildPaths.commonAppDest, buildNames.appJs, 'commonAppConcat:newer', path.join(buildPaths.commonAppDest, buildNames.appJs));
});

gulp.task('commonAppUglify', () => {
	$.fancyLog('----> //** Building Dist common App JS Files');
	return uglifyNewer(distPaths.commonAppSrc, distPaths.commonAppDest, 'commonAppUglify', path.join(distPaths.commonAppDest, distNames.commonAppMinJs));
});

gulp.task('commonAppDist', gulp.series('commonAppConcat:newer', 'commonAppUglify'));

gulp.task('commonAppDist-watch', () => {
	gulp.watch(buildPaths.commonAppGlob, gulp.series('commonAppConcat:newer', 'commonAppUglify'))
			.on('unlink', (ePath, stats) => {
				console.log(`${ePath} deleted, recompiling ${distNames.commonAppMinJs} - [commonApp-watch]`)
				concat.base(buildPaths.commonAppGlob, buildPaths.commonAppDest, buildNames.appJs, 'commonAppConcat'); // if src files get deleted, force rebuild of dist file.
			});
});

gulp.task('appDist-watch', gulp.parallel('lintBabel-watch', 'copyOptionalApp-watch', 'commonAppDist-watch'));
/* ----------------- */
/* MISC GULP TASKS
/* ----------------- */
gulp.task('outputPlugins', (done) => {
	console.log($);
	done(); // signal async completion
});


gulp.task('cleanBuildDist', (done) => {
	$.delete([commonPaths.outputBuild, commonPaths.outputDist], {force: true}, function(err, deleted) {
		if (err) throw err;
		// deleted files
		console.log(`${deleted} build and dist folders cleaned 🗑`);
		done();
	});
});




/**
 * ------------------------
 * COMPOSING GULP TASKS
 * ------------------------
 */



gulp.task('preWatch',
		gulp.series('cleanBuildDist',
			gulp.parallel(
					gulp.series('vendorDist'),
					gulp.series('cachedLint', 'babel',
							gulp.parallel('copyOptionalApp:newer', 'commonAppDist'),
					gulp.series('copySass')
		))));
// TODO make cachedLint-watch and babel-watch a series task
gulp.task('watching 👀', gulp.parallel('appDist-watch', 'copySass-watch', 'vendorDist-watch'));

// Default task
gulp.task('default', gulp.series('preWatch', 'watching 👀'));


// TODO delete cache of cached JS files processed with stylint
