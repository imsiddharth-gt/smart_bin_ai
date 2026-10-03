import time
import json
import requests
import cv2
import numpy as np
from gpiozero import DistanceSensor, LED
from picamera2 import Picamera2
from tensorflow.lite.python.interpreter import Interpreter

# -----------------------------
# CONFIGURATION
# -----------------------------

MODEL_PATH = "waste_model.tflite"
API_URL = "http://YOUR_SERVER_IP:5000/api/waste-event"

ULTRASONIC_TRIGGER = 17
ULTRASONIC_ECHO = 18

GREEN_LED = 23
RED_LED = 24

CONFIDENCE_THRESHOLD = 0.60

# Example classes.
# Replace these with the classes used by your trained model.
CLASS_NAMES = [
    "plastic_bottle",
    "paper",
    "cardboard",
    "metal_can",
    "glass",
    "food_waste",
    "coffee_cup",
    "plastic_bag",
    "other"
]

# Which waste belongs in which bin.
RECYCLABLE = {
    "plastic_bottle",
    "paper",
    "cardboard",
    "metal_can",
    "glass"
}

COMPOSTABLE = {
    "food_waste"
}

# -----------------------------
# HARDWARE
# -----------------------------

sensor = DistanceSensor(
    echo=ULTRASONIC_ECHO,
    trigger=ULTRASONIC_TRIGGER
)

green_led = LED(GREEN_LED)
red_led = LED(RED_LED)

camera = Picamera2()

camera.configure(
    camera.create_preview_configuration(
        main={
            "size": (640, 480),
            "format": "RGB888"
        }
    )
)

camera.start()
time.sleep(2)

# -----------------------------
# TENSORFLOW LITE
# -----------------------------

interpreter = Interpreter(MODEL_PATH)
interpreter.allocate_tensors()

input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

input_height = input_details[0]["shape"][1]
input_width = input_details[0]["shape"][2]


def classify_image(frame):

    image = cv2.resize(
        frame,
        (input_width, input_height)
    )

    image = np.expand_dims(
        image,
        axis=0
    )

    # Most MobileNet-style models expect 0-1 input.
    image = image.astype(np.float32) / 255.0

    interpreter.set_tensor(
        input_details[0]["index"],
        image
    )

    interpreter.invoke()

    output = interpreter.get_tensor(
        output_details[0]["index"]
    )[0]

    class_id = int(np.argmax(output))
    confidence = float(output[class_id])

    if class_id >= len(CLASS_NAMES):
        return "other", confidence

    return CLASS_NAMES[class_id], confidence


# -----------------------------
# BIN LOGIC
# -----------------------------

def get_expected_bin(item):

    if item in RECYCLABLE:
        return "recycling"

    if item in COMPOSTABLE:
        return "compost"

    return "general"


def show_result(correct):

    if correct:
        print("✓ Correct disposal")

        green_led.on()
        red_led.off()

        time.sleep(1)

        green_led.off()

    else:
        print("✗ Incorrect disposal")

        red_led.on()
        green_led.off()

        time.sleep(1)

        red_led.off()


# -----------------------------
# SEND EVENT TO SERVER
# -----------------------------

def send_event(item, confidence, expected_bin, correct):

    payload = {
        "item": item,
        "confidence": confidence,
        "expected_bin": expected_bin,
        "correct": correct,
        "bin_id": "WASTEWISE-001",
        "timestamp": time.time()
    }

    try:

        response = requests.post(
            API_URL,
            json=payload,
            timeout=3
        )

        print(
            "Server:",
            response.status_code
        )

    except Exception as error:

        print(
            "Server unavailable:",
            error
        )


# -----------------------------
# MAIN LOOP
# -----------------------------

print("WasteWise AI started.")

last_detection = 0

while True:

    try:

        # DistanceSensor.distance is normalized 0-1.
        distance = sensor.distance

        # Someone is approaching the bin.
        if distance < 0.25:

            # Prevent repeated detection.
            if time.time() - last_detection < 3:
                time.sleep(0.2)
                continue

            last_detection = time.time()

            print("Object detected.")

            # Give the user time to put the object
            # under the camera.
            time.sleep(0.5)

            frame = camera.capture_array()

            item, confidence = classify_image(frame)

            print(
                f"Detected: {item} "
                f"({confidence:.2%})"
            )

            if confidence < CONFIDENCE_THRESHOLD:

                print("Low confidence.")

                show_result(False)

                send_event(
                    "unknown",
                    confidence,
                    "unknown",
                    False
                )

                continue

            expected_bin = get_expected_bin(item)

            # For this MVP, assume the WasteWise
            # module is attached to the correct bin.
            bin_type = "recycling"

            correct = (
                expected_bin == bin_type
            )

            show_result(correct)

            send_event(
                item,
                confidence,
                expected_bin,
                correct
            )

        time.sleep(0.2)

    except KeyboardInterrupt:

        print("Stopping WasteWise.")

        break

    except Exception as error:

        print(
            "System error:",
            error
        )

        time.sleep(1)


camera.stop()