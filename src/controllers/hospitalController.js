import * as hospitalService from '../services/hospitalService.js';

export const getHospitals = async (req, res) => {
  try {
    const result = await hospitalService.getHospitalsList(req.query || {});

    return res.status(200).json({
      success: true,
      message: 'Hospitals fetched successfully',
      ...result
    });
  } catch (error) {
    console.error('Error in getHospitals controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching hospitals',
      error: error.message || error
    });
  }
};
