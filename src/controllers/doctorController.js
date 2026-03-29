import * as doctorService from '../services/doctorService.js';

export const getDoctors = async (req, res) => {
  try {
    // Vercel serverless request parameters often come from req.query
    const result = await doctorService.getDoctorsList(req.query || {});
    
    return res.status(200).json({
      success: true,
      message: 'Doctors fetched successfully',
      ...result
    });
  } catch (error) {
    console.error('Error in getDoctors controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching doctors',
      error: error.message || error
    });
  }
};
