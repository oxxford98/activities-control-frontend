import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RescheduleModal } from "./RescheduleModal";

jest.mock("primereact/dialog", () => ({
    Dialog: ({ visible, children }: any) =>
        visible ? <div>{children}</div> : null
}));

jest.mock("primereact/button", () => ({
    Button: ({ label, onClick, disabled }: any) => (
        <button onClick={onClick} disabled={disabled}>
            {label}
        </button>
    )
}));

jest.mock("primereact/inputtext", () => ({
    InputText: (props: any) => (
        <input
            value={props.value}
            onChange={props.onChange}
            type={props.type}
        />
    )
}));

const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    subActivityId: 1,
    title: "Preparar presentación",
    estimatedTime: 2,
    currentDate: "2026-06-26",
    onValidate: jest.fn(),
    onSave: jest.fn()
};


test("renders activity title", () => {
    render(<RescheduleModal {...defaultProps} />);

    expect(
        screen.getByText("Preparar presentación")
    ).toBeInTheDocument();
});

test("save button starts disabled", () => {

    render(<RescheduleModal {...defaultProps} />);

    expect(
        screen.getByText("Guardar cambios")
    ).toBeDisabled();

});


import { fireEvent } from "@testing-library/react";

test("cancel calls onClose", () => {

    render(<RescheduleModal {...defaultProps} />);

    fireEvent.click(
        screen.getByText("Cancelar")
    );

    expect(defaultProps.onClose).toHaveBeenCalled();

});