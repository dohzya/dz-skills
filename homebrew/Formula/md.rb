class Md < Formula
  desc "Markdown surgeon - powerful markdown file manipulation tool"
  homepage "https://github.com/dohzya/dz-skills"
  version "0.4.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/dohzya/dz-skills/releases/download/md-v0.4.0/md-darwin-arm64"
      sha256 "REPLACE_WITH_ACTUAL_SHA256_AFTER_RELEASE"
    elsif Hardware::CPU.intel?
      url "https://github.com/dohzya/dz-skills/releases/download/md-v0.4.0/md-darwin-x86_64"
      sha256 "REPLACE_WITH_ACTUAL_SHA256_AFTER_RELEASE"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/dohzya/dz-skills/releases/download/md-v0.4.0/md-linux-arm64"
      sha256 "REPLACE_WITH_ACTUAL_SHA256_AFTER_RELEASE"
    elsif Hardware::CPU.intel?
      url "https://github.com/dohzya/dz-skills/releases/download/md-v0.4.0/md-linux-x86_64"
      sha256 "REPLACE_WITH_ACTUAL_SHA256_AFTER_RELEASE"
    end
  end

  def install
    # Determine which binary was downloaded based on platform
    binary_name = if OS.mac?
      if Hardware::CPU.arm?
        "md-darwin-arm64"
      else
        "md-darwin-x86_64"
      end
    else
      if Hardware::CPU.arm?
        "md-linux-arm64"
      else
        "md-linux-x86_64"
      end
    end

    bin.install binary_name => "md"
  end

  test do
    system "#{bin}/md", "--help"
  end
end
