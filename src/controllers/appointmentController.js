import * as appointmentService from '../services/appointmentService.js';

export const getAppointments = async (req, res) => {
  try {
    const result = await appointmentService.getAppointmentsList(req.query || {});

    return res.status(200).json({
      success: true,
      message: 'Appointments fetched successfully',
      ...result
    });
  } catch (error) {
    console.error('Error in getAppointments controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching appointments',
      error: error.message || error
    });
  }
};
