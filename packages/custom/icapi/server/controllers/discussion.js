'use strict';
require('../models/discussion')
var utils = require('./utils'),
	mongoose = require('mongoose'),
	ObjectId = require('mongoose').Types.ObjectId,
	Discussion = mongoose.model('Discussion'),
	DiscussionArchive = mongoose.model('discussion_archive'),
	_ = require('lodash'),
	elasticsearch = require('./elasticsearch'),
	mailManager = require('./mailManager'),
	mean = require('meanio');

exports.read = function(req, res, next) {
	Discussion.findById(req.params.id, function(err, discussion) {
		if (err || !discussion) utils.checkAndHandleError(err ? err : !discussion, res, {message: 'Failed to read discussion with id: ' + req.params.id});
		else {
			res.status(200);
			return res.json(discussion);
		}
	});
};

exports.all = function(req, res) {
	var query = {};
	if (!(_.isEmpty(req.query))) {
		query = elasticsearch.advancedSearch(req.query);
	}

	mean.elasticsearch.search({
		index: 'discussion',
		'body': query,
		size: 3000
	}, function(err, response) {
		if (err)
			res.status(500).send('Failed to found discussion');
		else
			res.send(response.hits.hits.map(function(item) {
				return item._source
			}))
	});
};

exports.create = function(req, res, next) {
	var discussion = {
		creator: req.user._id
	};
	discussion = _.extend(discussion, req.body);
	new Discussion(discussion).save({
		user: req.user
	}, function(err, response) {
		utils.checkAndHandleError(err, res);
		res.json(response);
	});
};

exports.update = function(req, res, next) {

	if (!req.params.id) {
		return res.send(404, 'Cannot update discussion without id');
	}
	Discussion.findById(req.params.id, function(err, discussion) {
		utils.checkAndHandleError(err, res);

		discussion = _.extend(discussion, req.body);

		discussion.updated = new Date();

		discussion.save({
			user: req.user
		}, function(err, discussion) {
			utils.checkAndHandleError(err, res, 'Failed to update discussion');

			res.status(200);
			return res.json(discussion);
		});

	});

};

exports.destroy = function(req, res, next) {

	if (!req.params.id) {
		return res.send(404, 'Cannot destroy discussion without an id');
	}

	Discussion.findById(req.params.id, function(err, discussion) {
		if (err) utils.checkAndHandleError(err, res);
		else {
			if (!discussion) utils.checkAndHandleError('Cannot find discussion with id: ' + req.params.id, res, 'Cannot find discussion with id: ' + req.params.id);
			else
				discussion.remove({
					user: req.user
				}, function(err, success) {
					utils.checkAndHandleError(err, res, 'Failed to destroy discussion');

					res.status(200);
					return res.send({message: (success ? 'Discussion deleted' : 'Failed to delete discussion')});
				});
		}
	});
};

exports.readHistory = function(req, res, next) {
	if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
		var Query = DiscussionArchive.find({
			'c._id': new ObjectId(req.params.id)
		});
		Query.populate('u');
		Query.exec(function(err, discussions) {
			utils.checkAndHandleError(err, res, 'Failed to read history for discussion ' + req.params.id);

			res.status(200);
			return res.json(discussions);
		});
	} else
		utils.checkAndHandleError(req.params.id + ' is not a mongoose ObjectId', res, 'Failed to read history for discussion ' + req.params.id);
};

exports.invite = function(req, res) {
	Discussion.findOne({
		_id: req.params.id
	}).populate('creator').populate('watchers').exec(function(err, discussion) {
		mailManager.inviteDiscussion(discussion);
		res.json({});
	});
};

exports.summary = function(req, res) {
	Discussion.findOne({
		_id: req.params.id
	}).populate('creator').populate('watchers').exec(function(err, discussion) {
		mailManager.summaryDiscussion(discussion);
		res.json({});
	});
};