const Banquet = require('../models/banquet.model');
const { logger } = require('../utils/logger');
const Event = require('../models/event.model');
const { EVENT_LOCATION, EVENT_STATUS } = require('../utils/constants');

exports.getBanquets = async (req, res) => {
    try {
        const banquets = await Banquet.find();
        if (!banquets) {
            return res.status(404).json({
                status: 'error',
                message: 'No banquets found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: {
                banquets
            }
        });
    } catch (error) {
        logger.error(`Error getting banquets: ${error}`);
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.createBanquet = async (req, res) => {
    try {
        const newBanquet = await Banquet.create(req.body);
        logger.info(`Banquet created with ID: ${newBanquet._id}`);
        res.status(201).json({
            status: 'success',
            data: {
                banquet: newBanquet
            }
        });
    } catch (error) {
        logger.error(`Error creating banquet: ${error}`);
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getBanquet = async (req, res) => {
    try {
        const banquet = await Banquet.findById(req.params.id);
        if (!banquet) {
            return res.status(404).json({
                status: 'error',
                message: 'Banquet not found'
            });
        }
        res.status(200).json({
            status: 'success',
            data: {
                banquet
            }
        });
    } catch (error) {
        logger.error(`Error getting banquet: ${error}`);
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.updateBanquet = async (req, res) => {
    try {
        const banquet = await Banquet.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!banquet) {
            return res.status(404).json({
                status: 'error',
                message: 'Banquet not found'
            });
        }
        logger.info(`Banquet updated with ID: ${banquet._id}`);
        res.status(200).json({
            status: 'success',
            data: {
                banquet
            }
        });
    } catch (error) {
        logger.error(`Error updating banquet: ${error}`);
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.deleteBanquet = async (req, res) => {
    try {
        const banquet = await Banquet.findByIdAndDelete(req.params.id);
        if (!banquet) {
            return res.status(404).json({
                status: 'error',
                message: 'Banquet not found'
            });
        }
        logger.info(`Banquet deleted with ID: ${banquet._id}`);
        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        logger.error(`Error deleting banquet: ${error}`);
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getBanquetEvents = async (req, res) => {
    try {
        const banquet = await Banquet.findById(req.params.id);
        const events = await Event.find({ location: EVENT_LOCATION.BANQUET_HALL, status: EVENT_STATUS.CONFIRMED });
        res.status(200).json({
            status: 'success',
            data: {
                events
            }
        });
    } catch (error) {
        logger.error(`Error getting banquet events: ${error}`);
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};
