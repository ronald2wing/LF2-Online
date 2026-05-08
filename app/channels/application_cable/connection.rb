module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :client_id

    def connect
      self.client_id = SecureRandom.hex(8)
    end
  end
end
