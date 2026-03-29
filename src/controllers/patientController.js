import * as patientService from '../services/patientService.js';

export const getPatients = async (req, res) => {
  try {
    const result = await patientService.getPatientsList(req.query || {});

    return res.status(200).json({
      success: true,
      message: 'Patients fetched successfully',
      ...result
    });
  } catch (error) {
    console.error('Error in getPatients controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching patients',
      error: error.message || error
    });
  }
};
