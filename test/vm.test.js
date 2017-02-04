/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */
'use strict';

var test = require('tape').test;

var mod_kstat = require('kstat');
var mod_libuuid = require('libuuid');

var lib_instrumenterVm = require('../lib/instrumenter/vm');
var lib_common = require('../lib/common');

var kstatMetrics = { link: {}, memory_caps: {}, zones: {} };
kstatMetrics.zones.cpuUserUsage =
{
    module: 'zones',
    kstat_key: 'nsec_user',
    key: 'cpu_user_usage',
    type: 'counter',
    help: 'User CPU utilization in nanoseconds'
};
kstatMetrics.zones.cpuSysUsage =
{
    module: 'zones',
    kstat_key: 'nsec_sys',
    key: 'cpu_sys_usage',
    type: 'counter',
    help: 'System CPU usage in nanoseconds'
};
kstatMetrics.zones.cpuWaitTime =
{
    module: 'zones',
    kstat_key: 'nsec_waitrq',
    key: 'cpu_wait_time',
    type: 'counter',
    help: 'CPU wait time in nanoseconds'
};
kstatMetrics.zones.loadAvg =
{
    module: 'zones',
    kstat_key: 'avenrun_1min',
    key: 'load_average',
    type: 'gauge',
    help: 'Load average',
    modifier: lib_common.calculateLoadAvg
};
kstatMetrics.memory_caps.memAggUsage =
{
    module: 'memory_cap',
    kstat_key: 'rss',
    key: 'mem_agg_usage',
    type: 'gauge',
    help: 'Aggregate memory usage in bytes'
};
kstatMetrics.memory_caps.memLimit =
{
    module: 'memory_cap',
    kstat_key: 'physcap',
    key: 'mem_limit',
    type: 'gauge',
    help: 'Memory limit in bytes',
    modifier: lib_common.inskMemLimit
};
kstatMetrics.memory_caps.memSwap =
{
    module: 'memory_cap',
    kstat_key: 'swap',
    key: 'mem_swap',
    type: 'gauge',
    help: 'Swap in bytes'
};
kstatMetrics.memory_caps.memSwapLimit =
{
    module: 'memory_cap',
    kstat_key: 'swapcap',
    key: 'mem_swap_limit',
    type: 'gauge',
    help: 'Swap limit in bytes',
    modifier: lib_common.inskMemLimit
};
kstatMetrics.link.netAggPacketsIn =
{
    module: 'link',
    kstat_key: 'ipackets64',
    key: 'net_agg_packets_in',
    type: 'counter',
    help: 'Aggregate inbound packets'
};
kstatMetrics.link.netAggPacketsOut =
{
    module: 'link',
    kstat_key: 'opackets64',
    key: 'net_agg_packets_out',
    type: 'counter',
    help: 'Aggregate outbound packets'
};
kstatMetrics.link.netAggBytesIn =
{
    module: 'link',
    kstat_key: 'rbytes64',
    key: 'net_agg_bytes_in',
    type: 'counter',
    help: 'Aggregate inbound bytes'
};
kstatMetrics.link.netAggBytesOut =
{
    module: 'link',
    kstat_key: 'obytes64',
    key: 'net_agg_bytes_out',
    type: 'counter',
    help: 'Aggregate outbound bytes'
};

var zfsMetrics = {};
zfsMetrics.zfsUsed =
{
    zfs_key: 'used',
    key: 'zfs_used',
    type: 'gauge',
    help: 'zfs space used in bytes'
};
zfsMetrics.zfsAvailable =
{
    zfs_key: 'available',
    key: 'zfs_available',
    type: 'gauge',
    help: 'zfs space available in bytes'
};

var timeMetrics = {};
timeMetrics.now =
{
    date_key: 'now',
    key: 'time_of_day',
    type: 'counter',
    help: 'System time in seconds since epoch'
};

test('create vm', function _test(t) {
    t.plan(19);

    var vm;
    t.doesNotThrow(function _create() {
        var vm_uuid;
        var instance;
        var reader = new mod_kstat.Reader();
        lib_common.listRunningZones(reader, function _list(err, zones) {
            t.notOk(err, 'listRunningZones should not err');
            t.ok(zones, 'listRunningZones should return a zones object');
            vm_uuid = Object.keys(zones)[0];
            instance = zones[vm_uuid].instance;

            vm = new lib_instrumenterVm(vm_uuid, instance, reader);

            t.ok(vm, 'vm is defined');
            t.deepEqual(vm._uuid, vm_uuid, '_uuid');
            t.deepEqual(vm._instance, instance, '_instance');
            t.deepEqual(vm._reader,  reader, '_reader');
            t.deepEqual(vm._kstatMetrics, kstatMetrics, '_kstatMetrics');
            t.deepEqual(vm._zfsMetrics, zfsMetrics, '_zfsMetrics');
            t.deepEqual(vm._timeMetrics, timeMetrics, '_timeMetrics');
            t.ok(vm._linkReadOpts, '_linkReadOpts');
            t.equal(vm._linkReadOpts['class'], 'net', 'link class is net');
            t.equal(vm._linkReadOpts.module, 'link', 'link module is link');
            t.ok(vm._memReadOpts, '_memReadOpts');
            t.equal(vm._memReadOpts['class'],
                'zone_memory_cap',
                'mem class is zone_memory_cap');
            t.equal(vm._memReadOpts.module,
                'memory_cap',
                'mem module is memory_cap');
            t.ok(vm._zone_miscReadOpts, '_zone_miscReadOpts');
            t.equal(vm._zone_miscReadOpts['class'],
                    'zone_misc',
                    'zone_misc class is zone_misc');
            t.equal(vm._zone_miscReadOpts.module,
                    'zones',
                    'zone_misc module is zones');
            t.end();
        });

    }, 'create instrumenter does not throw an exception');

});

test('create vm fails', function _test(t) {
    t.plan(3);

    var vm;
    t.throws(function _create() {
        vm = new lib_instrumenterVm();
    }, 'vm_uuid must be a uuid');
    t.throws(function _create() {
        var vm_uuid = mod_libuuid.create();
        vm = new lib_instrumenterVm(vm_uuid);
    }, 'instance is required');

    t.notOk(vm, 'vm is not defined');

    t.end();
});
