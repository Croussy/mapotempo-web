# Be sure to restart your server when you modify this file.

# Add new mime types for use in respond_to blocks:
# Mime::Type.register "text/richtext", :rtf

Mime::Type.register "application/gpx+xml", :gpx
Mime::Type.register "text/csv", :excel
Mime::Type.register_alias :json, :tomtom
Mime::Type.register_alias :json, :masternaut
Mime::Type.register_alias :json, :alyacom
Mime::Type.register "image/svg+xml", :svg
