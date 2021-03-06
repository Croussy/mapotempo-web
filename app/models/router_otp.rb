# Copyright © Mapotempo, 2015
#
# This file is part of Mapotempo.
#
# Mapotempo is free software. You can redistribute it and/or
# modify since you respect the terms of the GNU Affero General
# Public License as published by the Free Software Foundation,
# either version 3 of the License, or (at your option) any later version.
#
# Mapotempo is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
# or FITNESS FOR A PARTICULAR PURPOSE.  See the Licenses for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with Mapotempo. If not, see:
# <http://www.gnu.org/licenses/agpl.html>
#
require 'otp'

class RouterOtp < Router
  validates :url, presence: true

  def trace(speed_multiplicator, lat1, lng1, lat2, lng2)
    distance, time, trace = Mapotempo::Application.config.otp.compute(url, ref, lat1, lng1, lat2, lng2, monday_morning)
    time *= 1.0 / speed_multiplicator
    [distance, time, trace]
  end

  def matrix(vector, speed_multiplicator, &block)
    time_multiplicator = 1.0 / speed_multiplicator
    total = positions**2
    vector.collect{ |v1|
      vector.collect{ |v2|
        distance, time, _trace = Mapotempo::Application.config.otp.compute(url, ref, v1[0], v1[1], v2[0], v2[1], monday_morning)
        block.call(1, total) if block
        [distance, time * time_multiplicator]
      }
    }
  end

  def isochrone?
    true
  end

  def isochrone(lat, lng, size)
    Mapotempo::Application.config.otp.isochrone(url, ref, lat, lng, size, monday_morning)
  end

  private

  def monday_morning
    monday_morning = Date.today
    monday_morning -= monday_morning.cwday - 1 # Go to last monday
    monday_morning.to_time + 9.hours # Go to monday 09:00
  end
end
