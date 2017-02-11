/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

/* Test the Metric Agent cache */
'use strict';

var test = require('tape').test;

var mod_bunyan = require('bunyan');
var mod_restify = require('restify');

var lib_app = require('../lib/app');

var log = mod_bunyan.createLogger({
    name: 'cmon-agent',
    serializers: mod_restify.bunyan.serializers
});

var DEFAULT_CONFIG = {
    logLevel: 'debug',
    port: 9090 /* 9090 chosen to not conflict with a running cmon-agent */
};

var DEFAULT_OPTS = { config: DEFAULT_CONFIG, log: log };

test('create app succeeds', function _test(t) {
    var app;

    t.plan(4);

    t.doesNotThrow(function _createApp() {
        app = new lib_app(DEFAULT_OPTS);
    }, 'app created without error');
    t.ok(app);
    t.ok(app.server);
    t.ok(app.collector);

    // TODO: So much more

    t.end();
});

test('create app fails with bad or no opts', function _test(t) {
    var app;

    t.plan(4);

    t.throws(function _noOpts() {
        app = new lib_app();
    }, 'opts');
    t.throws(function _emptyOpts() {
        app = new lib_app({});
    }, 'opts.config');
    t.throws(function _noLogOpts() {
        app = new lib_app({ config: {} });
    }, 'opts.log');
    t.notOk(app, 'app was not created');

    t.end();
});
