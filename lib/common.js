/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2017 Joyent, Inc.
 */
'use strict';

var mod_assert = require('assert-plus');
var mod_restify = require('restify');
var mod_vasync = require('vasync');

var forkExecWait = require('forkexec').forkExecWait;

var FSCALE = 256; /* derived from sys/param.h */

/*
 * Returns a handler that will log uncaught exceptions properly
 */
function uncaughtHandler(req, res, route, err) {
    res.send(new mod_restify.InternalError(err, 'Internal error'));
    /**
     * We don't bother logging the `res` here because it always looks like
     * the following, no added info to the log.
     *
     *      HTTP/1.1 500 Internal Server Error
     *      Content-Type: application/json
     *      Content-Length: 51
     *      Date: Wed, 29 Oct 2014 17:33:02 GMT
     *      x-request-id: a1fb11c0-5f91-11e4-92c7-3755959764aa
     *      x-response-time: 9
     *      Connection: keep-alive
     *
     *      {"code":"InternalError","message":"Internal error"}
     */
    req.log.error({err: err, route: route && route.name,
        req: req}, 'Uncaught exception');
}

function calculateLoadAvg(kstat) {
    mod_assert.ok(Number.isInteger(kstat), 'kstat must be an integer');

    return kstat / FSCALE;
}

function inskMemLimit(kstat) {
    mod_assert.ok(Number.isInteger(kstat), 'kstat must be an integer');

    if (kstat === Math.pow(2, 64) || kstat === 0) {
        return undefined;
    }

    return kstat;
}

/*
 * Get list of all running zones and creates a mapping of vm_uuid to vm object
 * with a valid kstat reader.
 *
 * Derived from sdc-amon listAllZones.
 */
function listRunningZones(reader, cb) {
    var zones = {};
    forkExecWait({
        'argv': ['/usr/sbin/zoneadm', 'list', '-p']
    }, function _processOutput(err, data) {
        if (err) {
            cb(err);
            return;
        }

        var lines = data.stdout.trim().split('\n');
        mod_vasync.forEachPipeline({
            'inputs': lines,
            'func': function _mapLine(line, next) {
                var vals = line.split(':');
                var zoneid = parseInt(vals[0], 10); /* zoneid/instance int */

                /* skip the GZ */
                if (zoneid > 0) {
                    var uuid = vals[4]; /* uuid is the 5th col in the output */
                    /* TODO: REMOVE CIRCULAR USAGE OF VM HERE!!! */
                    zones[uuid] =
                    {
                        instance: zoneid,
                        metrics: new (
                            require('./instrumenter/vm'))(uuid, zoneid, reader)
                    };
                }

                next();
            }
        }, function _listRunningZonesHandleFep(fepErr) {
            cb(fepErr, zones);
            return;
        });
    });
}

module.exports = {
    calculateLoadAvg: calculateLoadAvg,
    inskMemLimit: inskMemLimit,
    listRunningZones: listRunningZones,
    uncaughtHandler: uncaughtHandler
};
