# Copyright © Mapotempo, 2014
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
require 'trace'

class Router < ActiveRecord::Base
  nilify_blanks
  validates :name, presence: true
  validates :url, presence: true

  def trace(lat1, lng1, lat2, lng2)
    Trace.compute(url, lat1, lng1, lat2, lng2)
  end

  def matrix(positions, &block)
    if true
      # Engine support matrix computation
      vector = positions.map{ |position| [position.lat, position.lng] }
      Trace.matrix(url, vector).map{ |row|
        row.map{ |v| [v, v] }
      }
    else
      positions.collect{ |position1|
        positions.collect{ |position2|
          distance, time, trace = Trace.compute(url, position1.lat, position1.lng, position2.lat, position2.lng)
          block.call if block
          [distance, time]
        }
      }
    end
  end
end