module GamesHelper
  # Maps logical asset names (e.g. "UI/frontpage.png") to fingerprinted URLs
  # for binary assets under engine/pack/. Built once per request and embedded
  # as JSON so the engine's asset registry can resolve sprites and SFX at boot.
  def pack_asset_manifest
    @pack_asset_manifest ||= build_manifest
  end

  private

  def build_manifest
    prefix = "engine/pack/"

    Rails.application.assets.load_path.assets.each_with_object({}) do |asset, map|
      logical = asset.logical_path.to_s
      next unless logical.start_with?(prefix)
      next if logical.end_with?(".js")  # loaded via importmap
      next if logical.end_with?(".css") # loaded via <link> tags

      map[logical.delete_prefix(prefix)] = asset_path(logical)
    end
  end
end
