from PIL import Image
import os

source_path = r"c:\Users\fonsi\Desktop\AgilityAsturias\public\Images\Agility_Asturias_logo.jpg"
output_dir = r"c:\Users\fonsi\Desktop\AgilityAsturias\public\icons"
sizes = [72, 96, 128, 144, 152, 192, 384, 512]

def generate_icons():
    if not os.path.exists(source_path):
        print(f"Error: Source image not found at {source_path}")
        return

    try:
        img = Image.open(source_path)
        print(f"Opened image: {img.format}, {img.size}, {img.mode}")

        # Convert to RGB if necessary (though JPG is usually RGB or CMYK)
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Create a square image
        width, height = img.size
        if width != height:
            # Crop to center square
            new_size = min(width, height)
            left = (width - new_size) / 2
            top = (height - new_size) / 2
            right = (width + new_size) / 2
            bottom = (height + new_size) / 2
            img = img.crop((left, top, right, bottom))
            print(f"Cropped to square: {img.size}")
        
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        for size in sizes:
            # high quality resize
            new_img = img.resize((size, size), Image.Resampling.LANCZOS)
            output_filename = f"icon-{size}x{size}.png"
            output_path = os.path.join(output_dir, output_filename)
            new_img.save(output_path, "PNG")
            print(f"Generated {output_filename}")

        print("All icons generated successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    generate_icons()
