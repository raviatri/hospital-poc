import * as slotService from '../services/slotService.js';

export const getSlots = async (req, res) => {
  try {
    const result = await slotService.getAvailableSlots(req.query || {});
    return res.status(200).json({
      success: true,
      message: 'Available slots fetched successfully',
      ...result
    });
  } catch (error) {
    console.error('Error in getSlots controller:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Error while fetching slots'
    });
  }
};
